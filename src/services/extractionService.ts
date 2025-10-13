import type {
  SchemaItem,
  ExtractionResult,
  AttributeData,
  DiscoveredAttribute,
  EnhancedExtractionResult
} from "../types/extraction";
import { PromptService } from "./promptService";
import { ApiService } from "./apiService";
import { VLMService } from "./vlmService";
import { ResponseParser } from "./responseParser";
import { OCRService, ExtractedLabels } from "./ocrService";

export class ExtractionService {
  private promptService = new PromptService();
  private responseParser = new ResponseParser();
  private apiService = new ApiService();
  private vlmService = new VLMService();
  private ocrService = new OCRService();

  async extractAttributes(
    base64Image: string,
    schema: SchemaItem[],
    customPrompt?: string,
    categoryName?: string
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      let prompt: string;
      if (customPrompt) {
        prompt = customPrompt;
      } else if (categoryName) {
        prompt = this.promptService.generateCategorySpecificPrompt(schema, categoryName);
      } else {
        prompt = this.promptService.generateGenericPrompt(schema);
      }

      const apiResponse = await this.apiService.callVisionAPI(base64Image, prompt);
      const attributes = await this.responseParser.parseResponse(apiResponse.content, schema);
      
      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(attributes);

      return {
        attributes,
        tokensUsed: apiResponse.tokensUsed,
        modelUsed: apiResponse.modelUsed,
        processingTime,
        confidence
      };
    } catch (error) {
      console.error('Extraction failed:', error);
      throw new Error(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractWithDiscovery(
    base64Image: string,
    schema: SchemaItem[],
    categoryName?: string,
    discoveryMode = false,
    department?: string,
    subDepartment?: string
  ): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();

    try {
      // � TOKEN OPTIMIZATION: Use schema-driven prompts with department context
      const prompt = discoveryMode 
        ? this.promptService.generateDiscoveryPrompt(schema, categoryName)
        : this.promptService.generateOptimizedPrompt(schema, categoryName, department, subDepartment);

      console.log(`🔍 Optimized API Call - Discovery: ${discoveryMode}, Prompt: ${prompt.length} chars, Schema: ${schema.length} attrs`);
      
      // 🎯 USE VLM FALLBACK SYSTEM FOR BETTER FASHION EXTRACTION
      let apiResponse;
      try {
        console.log('🎯 Attempting VLM fallback extraction...');
        const vlmResponse = await this.vlmService.extractWithFallback(base64Image, prompt);
        apiResponse = {
          content: vlmResponse.content,
          tokensUsed: vlmResponse.tokensUsed,
          modelUsed: vlmResponse.modelUsed
        };
        console.log(`✅ VLM Success with ${vlmResponse.provider} (${vlmResponse.totalAttempts} attempts)`);
      } catch (vlmError) {
        console.log(`⚠️ VLM fallback failed, using standard OpenAI: ${vlmError instanceof Error ? vlmError.message : 'Unknown error'}`);
        // Fallback to standard OpenAI API
        apiResponse = await this.apiService.callVisionAPI(base64Image, prompt);
      }
      
      let attributes: AttributeData;
      let discoveries: DiscoveredAttribute[] = [];

      if (discoveryMode) {
        // Only parse enhanced response when discovery is enabled
        const result = await this.responseParser.parseEnhancedResponse(apiResponse.content, schema);
        attributes = result.attributes;
        discoveries = result.discoveries;
        console.log(`✨ Discovery Results: ${discoveries.length} discoveries found`);
      } else {
        // Use lightweight parsing for basic extraction
        attributes = await this.responseParser.parseResponse(apiResponse.content, schema);
        console.log(`⚡ Basic Extraction: ${Object.keys(attributes).length} attributes extracted`);
      }

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(attributes);

      // 🔧 OPTIMIZATION: Only calculate discovery stats when discoveries exist
      const discoveryStats = discoveryMode && discoveries.length > 0 ? {
        totalFound: discoveries.length,
        highConfidence: discoveries.filter(d => d.confidence >= 80).length,
        schemaPromotable: discoveries.filter(d => d.isPromotable).length,
        uniqueKeys: new Set(discoveries.map(d => d.key)).size
      } : {
        totalFound: 0,
        highConfidence: 0,
        schemaPromotable: 0,
        uniqueKeys: 0
      };

      console.log(`⏱️ Processing Complete - Time: ${processingTime}ms, Tokens: ${apiResponse.tokensUsed}, Confidence: ${confidence}%`);

      return {
        attributes,
        tokensUsed: apiResponse.tokensUsed,
        modelUsed: apiResponse.modelUsed,
        processingTime,
        confidence,
        discoveries: discoveryMode ? discoveries : [], // Only return discoveries when enabled
        discoveryStats
      };
    } catch (error) {
      console.error('Enhanced extraction failed:', error);
      throw new Error(`Enhanced extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractWithMultiCrop(
    base64Image: string,
    schema: SchemaItem[],
    categoryName?: string,
    discoveryMode = false,
    department?: string,
    subDepartment?: string
  ): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();

    try {
      console.log('🔍 Starting multi-crop analysis...');
      
      // First, enhance the full image
      const { enhanceImageForAI, generateMultipleCrops } = await import('../utils/imageProcessor');
      const enhancedFullImage = await enhanceImageForAI(base64Image);
      console.log('✅ Full image enhanced');

      // Generate multiple crops for detailed analysis
      const crops = await generateMultipleCrops(base64Image);
      console.log(`✅ Generated ${crops.length} crop sections`);

      // 📖 EXTRACT OCR LABELS FROM IMAGE
      console.log('📖 Running OCR text extraction...');
      const imageBuffer = Buffer.from(base64Image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      let ocrLabels: ExtractedLabels;
      
      try {
        const ocrResults = await this.ocrService.extractLabelsFromMultipleCrops(imageBuffer);
        ocrLabels = ocrResults.consolidatedLabels;
        console.log(`✅ OCR extraction complete - ${Object.values(ocrLabels).flat().length - 1} labels found`);
      } catch (ocrError) {
        console.warn('⚠️ OCR extraction failed, continuing without OCR data:', ocrError);
        ocrLabels = {
          sizeLabels: [],
          brandLabels: [],
          careLabels: [],
          materialLabels: [],
          countryLabels: [],
          priceLabels: [],
          generalText: [],
          confidence: 0
        };
      }

      // Create optimized prompt for multi-crop analysis enhanced with OCR data
      const basePrompt = discoveryMode 
        ? this.promptService.generateDiscoveryPrompt(schema, categoryName)
        : this.promptService.generateOptimizedPrompt(schema, categoryName, department, subDepartment);
      
      const prompt = this.promptService.enhancePromptWithOCR(basePrompt, ocrLabels);

      console.log('🎯 Analyzing enhanced full image...');
      
      // Analyze the enhanced full image first
      let fullImageResponse;
      try {
        const vlmResponse = await this.vlmService.extractWithFallback(enhancedFullImage, prompt);
        fullImageResponse = {
          content: vlmResponse.content,
          tokensUsed: vlmResponse.tokensUsed,
          modelUsed: vlmResponse.modelUsed
        };
        console.log(`✅ Full image VLM analysis complete with ${vlmResponse.provider}`);
      } catch (vlmError) {
        console.log(`⚠️ Full image VLM failed, using OpenAI: ${vlmError instanceof Error ? vlmError.message : 'Unknown error'}`);
        fullImageResponse = await this.apiService.callVisionAPI(enhancedFullImage, prompt);
      }

      // Parse full image results
      let fullImageAttributes: AttributeData;
      let discoveries: DiscoveredAttribute[] = [];

      if (discoveryMode) {
        const result = await this.responseParser.parseEnhancedResponse(fullImageResponse.content, schema);
        fullImageAttributes = result.attributes;
        discoveries = result.discoveries;
      } else {
        fullImageAttributes = await this.responseParser.parseResponse(fullImageResponse.content, schema);
      }

      console.log('🔍 Analyzing crop sections for detail enhancement...');
      
      // Analyze each crop section for additional details
      const cropPromises = crops.map(async (crop: any, index: number) => {
        try {
          console.log(`📷 Analyzing crop ${index + 1}/${crops.length} (${crop.section})`);
          
          // Use a simplified prompt for crop analysis focusing on specific details
          const cropPrompt = this.promptService.generateCropAnalysisPrompt(schema, crop.section, categoryName);
          
          let cropResponse;
          try {
            const vlmResponse = await this.vlmService.extractWithFallback(crop.image, cropPrompt);
            cropResponse = {
              content: vlmResponse.content,
              tokensUsed: vlmResponse.tokensUsed,
              modelUsed: vlmResponse.modelUsed
            };
          } catch (vlmError) {
            // Fallback to OpenAI for crop analysis
            cropResponse = await this.apiService.callVisionAPI(crop.image, cropPrompt);
          }

          const cropAttributes = await this.responseParser.parseResponse(cropResponse.content, schema);
          
          return {
            section: crop.section,
            attributes: cropAttributes,
            tokensUsed: cropResponse.tokensUsed
          };
        } catch (error) {
          console.warn(`⚠️ Crop ${crop.section} analysis failed:`, error);
          return {
            section: crop.section,
            attributes: {},
            tokensUsed: 0
          };
        }
      });

      const cropResults = await Promise.allSettled(cropPromises);
      const successfulCrops = cropResults
        .filter((result: any): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map((result: any) => result.value);

      console.log(`✅ Crop analysis complete: ${successfulCrops.length}/${crops.length} successful`);

      // Consolidate results: Full image takes priority, crops fill gaps and enhance confidence
      const consolidatedAttributes = this.consolidateMultiCropResults(
        fullImageAttributes,
        successfulCrops.map((crop: any) => crop.attributes),
        schema
      );

      const totalTokensUsed = fullImageResponse.tokensUsed + 
        successfulCrops.reduce((sum: number, crop: any) => sum + crop.tokensUsed, 0);
      
      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(consolidatedAttributes);

      const discoveryStats = discoveryMode && discoveries.length > 0 ? {
        totalFound: discoveries.length,
        highConfidence: discoveries.filter(d => d.confidence >= 80).length,
        schemaPromotable: discoveries.filter(d => d.isPromotable).length,
        uniqueKeys: new Set(discoveries.map(d => d.key)).size
      } : {
        totalFound: 0,
        highConfidence: 0,
        schemaPromotable: 0,
        uniqueKeys: 0
      };

      console.log(`⏱️ Multi-crop analysis complete - Time: ${processingTime}ms, Tokens: ${totalTokensUsed}, Confidence: ${confidence}%`);

      return {
        attributes: consolidatedAttributes,
        tokensUsed: totalTokensUsed,
        modelUsed: fullImageResponse.modelUsed,
        processingTime,
        confidence,
        discoveries: discoveryMode ? discoveries : [],
        discoveryStats,
        ocrLabels // 📖 Include OCR-extracted labels
      };
    } catch (error) {
      console.error('Multi-crop extraction failed:', error);
      throw new Error(`Multi-crop extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private consolidateMultiCropResults(
    fullImageAttributes: AttributeData,
    cropAttributesList: AttributeData[],
    schema: SchemaItem[]
  ): AttributeData {
    const consolidated: AttributeData = { ...fullImageAttributes };

    // For each schema attribute, enhance or fill from crop results
    schema.forEach(schemaItem => {
      const fullImageAttr = fullImageAttributes[schemaItem.key];
      
      // If full image didn't detect this attribute or has low confidence, check crops
      if (!fullImageAttr || fullImageAttr.visualConfidence < 70) {
        const cropValues = cropAttributesList
          .map(cropAttrs => cropAttrs[schemaItem.key])
          .filter(attr => attr && attr.visualConfidence > 60)
          .sort((a, b) => b!.visualConfidence - a!.visualConfidence);

        if (cropValues.length > 0) {
          const bestCropValue = cropValues[0]!;
          
          if (!fullImageAttr || bestCropValue.visualConfidence > fullImageAttr.visualConfidence + 10) {
            // Use crop result if it's significantly more confident
            consolidated[schemaItem.key] = {
              ...bestCropValue,
              visualConfidence: Math.min(bestCropValue.visualConfidence, 85) // Cap confidence for crop results
            };
          }
        }
      }
    });

    return consolidated;
  }

  async extractWithDebug(
    base64Image: string,
    schema: SchemaItem[],
    categoryName?: string
  ): Promise<EnhancedExtractionResult & { debugInfo?: unknown }> {
    const baseResult = await this.extractWithDiscovery(base64Image, schema, categoryName, true);
    try {
      const prompt = this.promptService.generateDiscoveryPrompt(schema, categoryName);
      const aiResponse = await this.apiService.callVisionAPI(base64Image, prompt);

      const { debugInfo } = await this.responseParser.parseWithDebugInfo(
        aiResponse.content,
        schema
      );

      return { ...baseResult, debugInfo };
    } catch (error) {
      return {
        ...baseResult,
        debugInfo: {
          error: "Debug info extraction failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private calculateOverallConfidence(attributes: AttributeData): number {
    const confidenceValues = Object.values(attributes)
      .filter(attr => attr !== null)
      .map(attr => attr!.visualConfidence)
      .filter(conf => conf > 0);

    if (confidenceValues.length === 0) return 0;

    const average = confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length;
    return Math.round(average);
  }
}