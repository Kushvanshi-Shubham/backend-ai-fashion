import { VLMProvider, FashionExtractionRequest } from '../../../types/vlm';
import { EnhancedExtractionResult, AttributeData } from '../../../types/extraction';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GoogleVisionConfig {
  model: 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-pro-vision';
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export class GoogleVisionProvider implements VLMProvider {
  public readonly name = 'Google Gemini Vision';
  private config: GoogleVisionConfig;
  private client: GoogleGenerativeAI | null = null;

  constructor(config?: Partial<GoogleVisionConfig>) {
    this.config = {
      model: 'gemini-1.5-flash',
      maxTokens: 4000,
      temperature: 0.1,
      timeout: 30000,
      ...config
    };
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      console.log('✅ Google Vision provider initialized successfully');
    } else {
      console.log('⚠️ Google Vision provider: API key not configured');
    }
  }

  async extractAttributes(request: FashionExtractionRequest): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();
    console.log(`🔍 [Google ${this.config.model}] Starting extraction with ${request.schema.length} attributes`);
    
    if (!this.client) {
      throw new Error('Google Vision API client not initialized. Please set GOOGLE_API_KEY');
    }

    try {
      const prompt = this.buildPrompt(request);
      const response = await this.callGeminiVision(request.image, prompt);
      
      const { attributes, extractedMetadata } = await this.parseResponse(response.content, request.schema);
      const confidence = this.calculateConfidence(attributes);

      const processingTime = Date.now() - startTime;
      const extractedCount = Object.values(attributes).filter(attr => attr !== null).length;
      
      console.log(`✅ [Google Vision] Extraction complete: ${extractedCount}/${Object.keys(attributes).length} attributes, ${processingTime}ms`);
      console.log(`📊 [Google Vision] Performance: Confidence=${confidence}%, Tokens=${response.tokensUsed}`);

      return {
        attributes,
        confidence,
        tokensUsed: response.tokensUsed,
        modelUsed: this.config.model as any,
        processingTime,
        discoveries: [],
        discoveryStats: {
          totalFound: 0,
          highConfidence: 0,
          schemaPromotable: 0,
          uniqueKeys: 0
        },
        extractedMetadata: extractedMetadata || undefined
      };
    } catch (error) {
      console.error(`❌ [Google Vision] Extraction failed:`, error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Google Vision extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    return this.client !== null && !!process.env.GOOGLE_API_KEY;
  }

  async configure(config: Partial<GoogleVisionConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.initializeClient();
  }

  private buildPrompt(request: FashionExtractionRequest): string {
    const { schema, categoryName, department, subDepartment } = request;
    
    const categoryContext = categoryName 
      ? `\nCATEGORY: ${categoryName} (${department}/${subDepartment})`
      : '';

    const schemaDefinition = schema.map(item => {
      const allowedValues = item.allowedValues?.length
        ? ` (allowed: ${item.allowedValues.map(av => typeof av === 'string' ? av : av.shortForm).slice(0, 5).join(', ')}${item.allowedValues.length > 5 ? '...' : ''})`
        : '';
      return `- ${item.key}: ${item.label}${allowedValues}`;
    }).join('\n');

    return `You are an expert fashion AI analyst. Analyze this clothing image with precision.${categoryContext}

📋 EXTRACT ALL ${schema.length} ATTRIBUTES:
${schemaDefinition}

EXTRACTION PROCESS:
1. READ TAG/BOARD (if visible): Extract metadata (Vendor Name, Design Number, Rate, PPT Number, GSM)
2. ANALYZE GARMENT: Extract every attribute listed above
3. HANDLE MISSING VALUES: If truly not visible/determinable, use null
4. PROVIDE CONFIDENCE: Rate each extraction 0-100%

NULL VALUE HANDLING:
• "no_packet", "no_placket", "no plackets" → Use null
• "not visible", "cannot determine" → Use null
• Empty or N/A → Use null
• Only extract what you can actually see or infer confidently

CRITICAL: Return valid JSON only:
{
  "metadata": {
    "vendorName": "from tag" or null,
    "designNumber": "from tag" or null,
    "rate": "from tag" or null,
    "pptNumber": "from tag" or null,
    "gsm": "from tag" or null
  },
  "attributes": {
    "attribute_key": {
      "rawValue": "exact observation" or null,
      "schemaValue": "normalized value" or null,
      "visualConfidence": 85,
      "reasoning": "brief explanation"
    }
  }
}`;
  }

  private async callGeminiVision(imageData: string, prompt: string): Promise<{ content: string; tokensUsed: number }> {
    if (!this.client) {
      throw new Error('Google Vision client not initialized');
    }

    const model = this.client.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature
      }
    });

    // Extract base64 data and mime type
    const base64Match = imageData.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid image data format');
    }

    const [, mimeType, base64Data] = base64Match;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Gemini API provides usageMetadata with actual token counts
    const usage = response.usageMetadata;
    let tokensUsed = 0;
    
    if (usage) {
      // Use actual token counts from API response
      tokensUsed = (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0);
      console.log(`📊 [Gemini] Token Usage: Input=${usage.promptTokenCount}, Output=${usage.candidatesTokenCount}, Total=${tokensUsed}`);
    } else {
      // Fallback to estimation if usage data not available
      // Image tokens: ~258 tokens per image (Gemini's average)
      // Text tokens: ~4 characters per token
      const imageTokens = 258; // Standard estimate for images
      const promptTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(text.length / 4);
      tokensUsed = imageTokens + promptTokens + outputTokens;
      console.log(`📊 [Gemini] Estimated Tokens: Image=${imageTokens}, Prompt=${promptTokens}, Output=${outputTokens}, Total=${tokensUsed}`);
    }

    return {
      content: text,
      tokensUsed: tokensUsed
    };
  }

  private async parseResponse(content: string, schema: any[]): Promise<{ attributes: AttributeData; extractedMetadata?: any }> {
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      
      const extractedMetadata = parsed.metadata || null;
      const attributeSource = parsed.attributes || parsed;
      
      const attributes: AttributeData = {};
      
      const metadataMapping: Record<string, string> = {
        'vendorName': 'vendor_name',
        'designNumber': 'design_number',
        'pptNumber': 'ppt_number',
        'price': 'rate'
      };
      
      for (const schemaItem of schema) {
        const key = schemaItem.key;
        
        if (attributeSource[key]) {
          const rawValue = this.normalizeNullValue(attributeSource[key].rawValue);
          const schemaValue = this.normalizeNullValue(attributeSource[key].schemaValue);
          
          attributes[key] = {
            rawValue,
            schemaValue,
            visualConfidence: attributeSource[key].visualConfidence || 0,
            isNewDiscovery: false,
            mappingConfidence: attributeSource[key].visualConfidence || 0,
            reasoning: attributeSource[key].reasoning
          };
        } else if (extractedMetadata && Object.values(metadataMapping).includes(key)) {
          const metadataKey = Object.keys(metadataMapping).find(k => metadataMapping[k] === key);
          const value = metadataKey ? extractedMetadata[metadataKey] : null;
          
          if (value) {
            attributes[key] = {
              rawValue: value,
              schemaValue: value,
              visualConfidence: 95,
              isNewDiscovery: false,
              mappingConfidence: 95,
              reasoning: 'Extracted from visible tag/board'
            };
          } else {
            attributes[key] = null;
          }
        } else {
          attributes[key] = null;
        }
      }
      
      return { attributes, extractedMetadata };
    } catch (error) {
      console.error('❌ [Google Vision] Failed to parse response:', error);
      throw new Error(`Failed to parse Google Vision response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize null/missing value variations to null
   */
  private normalizeNullValue(value: any): any {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') return value;
    
    const lowerValue = value.toLowerCase().trim();
    const nullVariants = [
      'no_packet', 'no_placket', 'no plackets', 'no placket',
      'not visible', 'cannot determine', 'n/a', 'na',
      'not applicable', 'none', 'not found', 'unknown'
    ];
    
    if (nullVariants.includes(lowerValue)) {
      return null;
    }
    
    return value;
  }

  private calculateConfidence(attributes: AttributeData): number {
    const values = Object.values(attributes).filter(attr => attr !== null);
    if (values.length === 0) return 0;
    
    const totalConfidence = values.reduce((sum, attr) => sum + (attr?.visualConfidence || 0), 0);
    return Math.round(totalConfidence / values.length);
  }
}
