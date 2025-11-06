import { VLMProvider, VLMResult } from '../../types/vlm';
import { SchemaItem, AttributeData, EnhancedExtractionResult } from '../../types/extraction';
import { OpenAIVLMProvider } from './providers/openaiProvider';
import { HuggingFaceVLMProvider } from './providers/huggingfaceProvider';
import { OllamaVLMProvider } from './providers/ollamaProvider';
import { FashionCLIPProvider } from './providers/fashionClipProvider';
import { FashionExtractionRequest } from '../../types/vlm';

export class VLMService {
  private providers: Map<string, VLMProvider> = new Map();
  private fallbackChain: string[] = [];

  constructor() {
    this.initializeProviders();
    this.setupFallbackChain();
  }

  private initializeProviders(): void {
    // Primary providers for different use cases
    this.providers.set('openai-gpt4v', new OpenAIVLMProvider());
    this.providers.set('huggingface-llava', new HuggingFaceVLMProvider());
    this.providers.set('ollama-llava', new OllamaVLMProvider());
    this.providers.set('fashion-clip', new FashionCLIPProvider());
  }

  private setupFallbackChain(): void {
    this.fallbackChain = [
      'openai-gpt4v',      // Most reliable - use for real testing
      'huggingface-llava', // Cloud backup 
      'ollama-llava',      // Local (optional - will fail if not installed)
      'fashion-clip'       // Disabled for now
    ];
  }

  /**
   * ENHANCED EXTRACTION with Multi-VLM Pipeline
   */
  async extractFashionAttributes(
    request: FashionExtractionRequest
  ): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();
    
    console.log(`\n========== VLM EXTRACTION STARTED ==========`);
    console.log(`📊 Schema Items: ${request.schema.length}, Discovery: ${request.discoveryMode}`);
    console.log(`Category: ${request.categoryName || 'Unknown'}`);
    console.log(`🏷️ Department: ${request.department || 'Not specified'} / ${request.subDepartment || 'Not specified'}`);
    console.log(`🔧 Available Providers: ${Array.from(this.providers.keys()).join(', ')}`);
    console.log(`⛓️  Fallback Chain: ${this.fallbackChain.join(' → ')}`);

    try {
      // Stage 1: Fast Fashion-Specific Detection
      const fashionResult = await this.runFashionSpecificExtraction(request);
      
      // Stage 2: Detailed Analysis for Missing/Low-Confidence Attributes  
      const enhancedResult = await this.runDetailedAnalysis(request, fashionResult);
      
      // Stage 3: Discovery Mode (if enabled)
      const finalResult = request.discoveryMode 
        ? await this.runDiscoveryAnalysis(request, enhancedResult)
        : enhancedResult;

      const processingTime = Date.now() - startTime;
      
      console.log(`\n✅ ========== VLM EXTRACTION COMPLETE ==========`);
      console.log(`⏱️  Total Processing Time: ${processingTime}ms`);
      console.log(`Final Model Used: ${finalResult.modelUsed}`);
      console.log(`📈 Final Confidence: ${finalResult.confidence}%`);
      console.log(`🔍 Discoveries Found: ${finalResult.discoveries?.length || 0}`);
      console.log(`💰 Total Tokens Used: ${finalResult.tokensUsed || 0}`);
      console.log(`================================================\n`);

      return {
        ...finalResult,
        processingTime,
        modelUsed: 'multi-vlm-pipeline' as any,
        tokensUsed: finalResult.tokensUsed || 0
      };

    } catch (error) {
      console.error('❌ Multi-VLM Extraction Failed:', error);
      
      // Emergency fallback to single best available provider
      return await this.emergencyFallback(request);
    }
  }

  /**
   * 🎨 Stage 1: Fashion-Specific Rapid Extraction
   */
  private async runFashionSpecificExtraction(
    request: FashionExtractionRequest
  ): Promise<Partial<EnhancedExtractionResult>> {
    console.log('🎨 ========== STAGE 1: Fashion-Specific Analysis ==========');
    
    const fashionProvider = this.providers.get('fashion-clip');
    if (!fashionProvider) {
      console.log('❌ Fashion-CLIP provider not available, skipping to Stage 2');
      return { attributes: {}, confidence: 0, tokensUsed: 0 };
    }

    // Check if Fashion-CLIP is healthy
    const isHealthy = await fashionProvider.isHealthy();
    if (!isHealthy) {
      console.log('⚠️ Fashion-CLIP provider unhealthy, skipping to Stage 2');
      return { attributes: {}, confidence: 0, tokensUsed: 0 };
    }

    // Focus on fashion-specific attributes first
    const fashionSchema = this.filterFashionCoreAttributes(request.schema);
    
    console.log('[MODEL: Fashion-CLIP] Starting fashion-specific extraction');
    console.log('📋 Fashion-CLIP Processing Details:', {
      provider: 'fashion-clip',
      originalAttributes: request.schema.length,
      fashionAttributes: fashionSchema.length,
      categoryName: request.categoryName,
      department: request.department,
      processingMode: 'fashion-specialized'
    });
    
    const result = await fashionProvider.extractAttributes({
      ...request,
      schema: fashionSchema,
      mode: 'fashion-focused'
    });

    console.log(`✅ Fashion-CLIP Complete: ${Object.keys(result.attributes).length} attributes extracted`);
    console.log(`📊 Fashion-CLIP Performance:`, {
      model: result.modelUsed || 'fashion-clip',
      confidence: result.confidence,
      tokensUsed: result.tokensUsed || 0,
      processingTime: `${result.processingTime || 0}ms`
    });
    return result;
  }

  /**
   * 🔍 Stage 2: Detailed Analysis for Missing Attributes
   */
  private async runDetailedAnalysis(
    request: FashionExtractionRequest,
    fashionResult: Partial<EnhancedExtractionResult>
  ): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();
    console.log('\n🔍 ========== STAGE 2: Detailed Analysis ==========');

    // Identify low-confidence or missing attributes
    const missingAttributes = this.identifyMissingAttributes(request.schema, fashionResult.attributes || {});
    
    if (missingAttributes.length === 0) {
      console.log('🎉 All attributes extracted successfully in Stage 1');
      return fashionResult as EnhancedExtractionResult;
    }

    console.log(`🔍 Detailed Analysis needed for ${missingAttributes.length} attributes`);

    // Use OpenAI GPT-4V first (most reliable), then HuggingFace as backup
    const detailProvider = this.providers.get('openai-gpt4v') || this.providers.get('huggingface-llava');
    if (!detailProvider) {
      console.log('❌ No detailed analysis provider available, returning Stage 1 results');
      return fashionResult as EnhancedExtractionResult;
    }

    const providerId = detailProvider === this.providers.get('openai-gpt4v') ? 'openai-gpt4v' : 'huggingface-llava';
    console.log(`[MODEL: ${providerId.toUpperCase()}] Starting detailed analysis`);
    console.log('📋 Detailed Analysis Processing:', {
      provider: providerId,
      missingAttributes: missingAttributes.length,
      existingAttributes: Object.keys(fashionResult.attributes || {}).length,
      processingMode: 'detailed-analysis'
    });

    const detailResult = await detailProvider.extractAttributes({
      ...request,
      schema: missingAttributes,
      mode: 'detailed-analysis',
      existingAttributes: fashionResult.attributes
    });

    console.log(`✅ Detailed Analysis Complete: ${Object.keys(detailResult.attributes).length} additional attributes`);
    console.log(`📊 Detailed Analysis Performance:`, {
      model: detailResult.modelUsed || providerId,
      confidence: detailResult.confidence,
      tokensUsed: detailResult.tokensUsed || 0,
      processingTime: `${Date.now() - startTime}ms`
    });

    // Merge results
    const mergedAttributes = {
      ...fashionResult.attributes,
      ...detailResult.attributes
    };

    return {
      attributes: mergedAttributes,
      confidence: this.calculateOverallConfidence(mergedAttributes),
      tokensUsed: (fashionResult.tokensUsed || 0) + (detailResult.tokensUsed || 0),
      modelUsed: 'fashion-clip+llava' as any,
      processingTime: Date.now() - startTime,
      discoveries: [],
      discoveryStats: { totalFound: 0, highConfidence: 0, schemaPromotable: 0, uniqueKeys: 0 }
    };
  }

  /**
   * 🔬 Stage 3: Discovery Analysis (Optional)
   */
  private async runDiscoveryAnalysis(
    request: FashionExtractionRequest,
    baseResult: EnhancedExtractionResult
  ): Promise<EnhancedExtractionResult> {
    console.log('\n🔬 ========== STAGE 3: Discovery Analysis ==========');

    // Use the most capable model for discovery
    const discoveryProvider = this.providers.get('openai-gpt4v') || this.providers.get('huggingface-llava');
    if (!discoveryProvider) {
      console.log('❌ No discovery provider available, skipping discovery analysis');
      return baseResult;
    }

    const providerId = discoveryProvider === this.providers.get('openai-gpt4v') ? 'openai-gpt4v' : 'huggingface-llava';
    console.log(`[MODEL: ${providerId.toUpperCase()}] Starting discovery analysis`);
    console.log('📋 Discovery Processing:', {
      provider: providerId,
      existingAttributes: Object.keys(baseResult.attributes).length,
      discoveryMode: true,
      processingMode: 'discovery-mode'
    });

    const discoveryResult = await discoveryProvider.extractAttributes({
      ...request,
      mode: 'discovery-mode',
      existingAttributes: baseResult.attributes
    });

    console.log(`✅ Discovery Analysis Complete: ${discoveryResult.discoveries?.length || 0} new discoveries`);
    console.log(`📊 Discovery Performance:`, {
      model: discoveryResult.modelUsed || providerId,
      discoveries: discoveryResult.discoveries?.length || 0,
      confidence: discoveryResult.confidence,
      tokensUsed: discoveryResult.tokensUsed || 0
    });

    return {
      ...baseResult,
      discoveries: discoveryResult.discoveries || [],
      discoveryStats: discoveryResult.discoveryStats || baseResult.discoveryStats,
      tokensUsed: baseResult.tokensUsed + (discoveryResult.tokensUsed || 0)
    };
  }

  /**
   * 🚨 Emergency Fallback
   */
  private async emergencyFallback(
    request: FashionExtractionRequest
  ): Promise<EnhancedExtractionResult> {
    console.log('\n🚨 ========== EMERGENCY FALLBACK MODE ==========');
    console.log(`⚠️  Multi-VLM pipeline failed, attempting single-provider fallbacks`);
    console.log(`🔄 Available fallback providers: ${this.fallbackChain.join(' → ')}`);
    
    for (const providerId of this.fallbackChain) {
      const provider = this.providers.get(providerId);
      if (!provider) {
        console.log(`❌ Provider ${providerId} not available, skipping`);
        continue;
      }

      try {
        console.log(`[FALLBACK: ${providerId.toUpperCase()}] Attempting emergency extraction`);
        const startTime = Date.now();
        const result = await provider.extractAttributes(request);
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ [FALLBACK: ${providerId.toUpperCase()}] Emergency extraction successful!`);
        console.log(`📊 Fallback Performance: ${Object.keys(result.attributes).length} attributes, ${processingTime}ms, ${result.confidence}% confidence`);
        return result;
      } catch (error) {
        console.warn(`⚠️ [FALLBACK: ${providerId.toUpperCase()}] Failed:`, error instanceof Error ? error.message : 'Unknown error');
        continue;
      }
    }

    console.error('❌ ========== ALL VLM PROVIDERS FAILED ==========');
    throw new Error('All VLM providers failed');
  }

  /**
   * Helper Methods
   */
  private filterFashionCoreAttributes(schema: SchemaItem[]): SchemaItem[] {
    const fashionCoreKeys = [
      'color', 'fabric', 'pattern', 'style', 'fit', 'size', 'brand', 
      'material', 'texture', 'neckline', 'sleeve', 'length', 'closure'
    ];

    return schema.filter(item => 
      fashionCoreKeys.some(key => 
        item.key.toLowerCase().includes(key.toLowerCase()) ||
        item.label.toLowerCase().includes(key.toLowerCase())
      )
    );
  }

  private identifyMissingAttributes(schema: SchemaItem[], attributes: AttributeData): SchemaItem[] {
    return schema.filter(item => {
      const attr = attributes[item.key];
      return !attr || attr.visualConfidence < 70; // Low confidence threshold
    });
  }

  private calculateOverallConfidence(attributes: AttributeData): number {
    const confidenceValues = Object.values(attributes)
      .filter(attr => attr !== null)
      .map(attr => attr!.visualConfidence)
      .filter(conf => conf > 0);

    if (confidenceValues.length === 0) return 0;
    return Math.round(confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length);
  }

  /**
   * 📊 Provider Health Check
   */
  async checkProviderHealth(): Promise<Record<string, boolean>> {
    console.log('\n🏥 ========== VLM PROVIDER HEALTH CHECK ==========');
    const health: Record<string, boolean> = {};
    
    for (const [id, provider] of this.providers) {
      try {
        console.log(`🔍 Checking ${id}...`);
        const startTime = Date.now();
        const isHealthy = await provider.isHealthy();
        const checkTime = Date.now() - startTime;
        
        health[id] = isHealthy;
        console.log(`${isHealthy ? '✅' : '❌'} ${id}: ${isHealthy ? 'HEALTHY' : 'UNAVAILABLE'} (${checkTime}ms)`);
      } catch (error) {
        health[id] = false;
        console.log(`❌ ${id}: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const healthyCount = Object.values(health).filter(Boolean).length;
    console.log(`\n📊 Health Check Summary: ${healthyCount}/${this.providers.size} providers healthy`);
    console.log(`🔄 Fallback Chain: ${this.fallbackChain.filter(id => health[id]).join(' → ') || 'No healthy providers'}`);
    console.log('================================================\n');

    return health;
  }

  /**
   * ⚙️ Dynamic Provider Configuration
   */
  async configureProvider(providerId: string, config: any): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider && 'configure' in provider) {
      await (provider as any).configure(config);
    }
  }
}