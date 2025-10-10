import { VLMProvider, FashionExtractionRequest, OpenAIVLMConfig, VLMResult } from '../../../types/vlm';
import { EnhancedExtractionResult, AttributeData } from '../../../types/extraction';
import { BaseApiService } from '../../baseApi';

export class OpenAIVLMProvider extends BaseApiService implements VLMProvider {
  public readonly name = 'OpenAI GPT-4 Vision';
  private config: OpenAIVLMConfig;

  constructor(config?: Partial<OpenAIVLMConfig>) {
    super();
    this.config = {
      model: 'gpt-4o',
      detail: 'high',
      maxTokens: 3000,
      temperature: 0.1,
      timeout: 30000,
      ...config
    };
  }

  async extractAttributes(request: FashionExtractionRequest): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();
    console.log(`🤖 [OpenAI GPT-4V] Starting extraction with ${request.schema.length} attributes`);
    console.log(`🔧 OpenAI Config: Model=${this.config.model}, MaxTokens=${this.config.maxTokens}, Detail=${this.config.detail}`);
    
    try {
      const prompt = this.buildPrompt(request);
      const response = await this.callVisionAPI(request.image, prompt);
      
      const attributes = await this.parseResponse(response.content, request.schema);
      const confidence = this.calculateConfidence(attributes);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [OpenAI GPT-4V] Extraction complete: ${Object.keys(attributes).length} attributes, ${processingTime}ms`);
      console.log(`📊 [OpenAI GPT-4V] Performance: Confidence=${confidence}%, Tokens=${response.tokensUsed || 0}`);

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
        }
      };
    } catch (error) {
      console.error(`❌ [OpenAI GPT-4V] Extraction failed:`, error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`OpenAI VLM extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      return this.isConfigured();
    } catch {
      return false;
    }
  }

  async configure(config: OpenAIVLMConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  private buildPrompt(request: FashionExtractionRequest): string {
    const { schema, categoryName, mode, department, subDepartment } = request;
    
    const basePrompt = `You are an expert fashion AI analyst. Analyze this clothing image and extract attributes with precision.`;
    
    const categoryContext = categoryName 
      ? `\nCATEGORY: ${categoryName} (${department}/${subDepartment})`
      : '';

    const schemaDefinition = schema.map(item => {
      const allowedValues = item.allowedValues?.length
        ? ` (allowed: ${item.allowedValues.map(av => typeof av === 'string' ? av : av.shortForm).join(', ')})`
        : '';
      return `- ${item.key}: ${item.label}${allowedValues}`;
    }).join('\n');

    const modeInstructions = this.getModeSpecificInstructions(mode || 'fashion-focused');

    return `${basePrompt}${categoryContext}

EXTRACT THESE ATTRIBUTES:
${schemaDefinition}

${modeInstructions}

CRITICAL: Return valid JSON only:
{
  "attribute_key": {
    "rawValue": "exact observation",
    "schemaValue": "normalized value",
    "visualConfidence": 85,
    "reasoning": "brief explanation"
  }
}`;
  }

  private getModeSpecificInstructions(mode: string): string {
    switch (mode) {
      case 'fashion-focused':
        return `FOCUS: Core fashion attributes (color, fabric, style, fit). Fast and accurate extraction.`;
      
      case 'detailed-analysis':
        return `FOCUS: Detailed analysis of construction, materials, and fine details. High precision required.`;
      
      case 'discovery-mode':
        return `FOCUS: Discover additional attributes not in schema. Look for brands, care labels, unique features.`;
      
      default:
        return `FOCUS: Standard comprehensive analysis.`;
    }
  }

  private async callVisionAPI(base64Image: string, prompt: string) {
    const formattedImage = base64Image.startsWith('data:') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;

    const requestPayload = {
      model: this.config.model,
      messages: [{
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: prompt },
          {
            type: 'image_url' as const,
            image_url: {
              url: formattedImage,
              detail: this.config.detail
            }
          }
        ]
      }],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    };

    const response = await this.makeRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(requestPayload)
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'API call failed');
    }

    const apiData = response.data as any;
    const choice = apiData.choices[0];

    return {
      content: choice.message.content,
      tokensUsed: apiData.usage.total_tokens,
      modelUsed: this.config.model
    };
  }

  private async parseResponse(content: string, schema: any[]): Promise<AttributeData> {
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      
      // Validate and structure the response
      const attributes: AttributeData = {};
      
      for (const schemaItem of schema) {
        const key = schemaItem.key;
        if (parsed[key]) {
          attributes[key] = {
            rawValue: parsed[key].rawValue || null,
            schemaValue: parsed[key].schemaValue || null,
            visualConfidence: parsed[key].visualConfidence || 0,
            isNewDiscovery: false,
            mappingConfidence: parsed[key].visualConfidence || 0,
            reasoning: parsed[key].reasoning
          };
        } else {
          attributes[key] = null;
        }
      }
      
      return attributes;
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateConfidence(attributes: AttributeData): number {
    const confidenceValues = Object.values(attributes)
      .filter(attr => attr !== null)
      .map(attr => attr!.visualConfidence)
      .filter(conf => conf > 0);

    if (confidenceValues.length === 0) return 0;
    return Math.round(confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length);
  }
}