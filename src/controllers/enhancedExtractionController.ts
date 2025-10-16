import { Request, Response, NextFunction } from 'express';
import { VLMService } from '../services/vlm/vlmService';
import { ImageProcessor } from '../utils/imageProcessor';
import { cacheService } from '../services/cacheService';
import type { SchemaItem, ExtractionRequest } from '../types/extraction';
import type { FashionExtractionRequest } from '../types/vlm';

export class EnhancedExtractionController {
  private vlmService = new VLMService();

  /**
   * 🚀 Enhanced Multi-VLM Fashion Extraction from Upload
   */
  extractFromUploadVLM = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided',
          timestamp: Date.now()
        });
        return;
      }

      // Validate the image file
      ImageProcessor.validateImageFile(req.file);

      // Parse the request body
      const { 
        schema, 
        categoryName, 
        customPrompt, 
        discoveryMode, 
        department, 
        subDepartment,
        season,
        occasion 
      } = req.body;
      
      if (!schema) {
        res.status(400).json({
          success: false,
          error: 'Schema is required',
          timestamp: Date.now()
        });
        return;
      }

      let parsedSchema: SchemaItem[];
      try {
        parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
      } catch (error) {
        res.status(400).json({
          success: false,
          error: 'Invalid schema format',
          timestamp: Date.now()
        });
        return;
      }

      // Convert image to base64
      const base64Image = await ImageProcessor.processImageToBase64(req.file);

      console.log(`🚀 Enhanced VLM Extraction Started - Category: ${categoryName}, Schema: ${parsedSchema.length} attrs`);

      // Create enhanced fashion extraction request
      const vlmRequest: FashionExtractionRequest = {
        image: base64Image,
        schema: parsedSchema,
        categoryName,
        customPrompt,
        discoveryMode: discoveryMode === 'true' || discoveryMode === true,
        department: department as any,
        subDepartment: subDepartment as any,
        season: season as any,
        occasion: occasion as any
      };

      // Extract using Multi-VLM pipeline
      const result = await this.vlmService.extractFashionAttributes(vlmRequest);

      console.log(`✅ Enhanced VLM Extraction Complete - Confidence: ${result.confidence}%, Time: ${result.processingTime}ms`);

      res.json({
        success: true,
        data: result,
        metadata: {
          enhancedMode: true,
          vlmPipeline: 'multi-model',
          fashionSpecialized: true
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Enhanced VLM extraction failed:', error);
      next(error);
    }
  };

  /**
   * 🎯 Enhanced Multi-VLM Fashion Extraction from Base64
   */
  extractFromBase64VLM = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { 
        image, 
        schema, 
        categoryName, 
        customPrompt, 
        discoveryMode,
        forceRefresh,
        department,
        subDepartment,
        season,
        occasion
      }: ExtractionRequest & {
        department?: string;
        subDepartment?: string;
        season?: string;
        occasion?: string;
      } = req.body;

      if (!image) {
        res.status(400).json({
          success: false,
          error: 'Base64 image is required',
          timestamp: Date.now()
        });
        return;
      }

      if (!schema) {
        res.status(400).json({
          success: false,
          error: 'Schema is required',
          timestamp: Date.now()
        });
        return;
      }

      console.log(`🎯 Enhanced Base64 VLM Extraction - Discovery: ${discoveryMode}, Schema: ${schema.length} attrs, Force Refresh: ${forceRefresh}`);

      // 💾 Check cache first (skip if discovery mode, custom prompt, or force refresh requested)
      const shouldUseCache = !discoveryMode && !customPrompt && !forceRefresh;
      
      if (shouldUseCache) {
        const cachedResult = await cacheService.get(image, schema, categoryName);
        if (cachedResult) {
          console.log(`⚡ Cache HIT - Returning cached result instantly`);
          res.json({
            success: true,
            data: cachedResult,
            metadata: {
              enhancedMode: true,
              vlmPipeline: 'multi-model',
              fashionSpecialized: true,
              cached: true,
              cacheHit: true
            },
            timestamp: Date.now()
          });
          return;
        }
      }

      // Create enhanced fashion extraction request
      const vlmRequest: FashionExtractionRequest = {
        image,
        schema,
        categoryName,
        customPrompt,
        discoveryMode: discoveryMode || false,
        department: department as any,
        subDepartment: subDepartment as any,
        season: season as any,
        occasion: occasion as any
      };

      // Extract using Multi-VLM pipeline
      const result = await this.vlmService.extractFashionAttributes(vlmRequest);

      // 💾 Cache the result - always cache fresh extractions (except discovery mode)
      const shouldCacheResult = !discoveryMode && !customPrompt;
      if (shouldCacheResult) {
        await cacheService.set(image, schema, result, categoryName);
        if (forceRefresh) {
          console.log(`🔄 Force Refresh - Updated cache with fresh VLM result`);
        }
      }

      console.log(`✅ Enhanced Base64 VLM Complete - Confidence: ${result.confidence}%, Discoveries: ${result.discoveries?.length || 0}`);

      res.json({
        success: true,
        data: result,
        metadata: {
          enhancedMode: true,
          vlmPipeline: 'multi-model',
          fashionSpecialized: true,
          discoveryEnabled: discoveryMode,
          cached: false,
          forceRefresh: forceRefresh || false
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Enhanced Base64 VLM extraction failed:', error);
      next(error);
    }
  };

  /**
   * 🔬 Advanced VLM Analysis with Full Pipeline Debug
   */
  extractWithAdvancedVLM = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { 
        image, 
        schema, 
        categoryName,
        department,
        subDepartment
      }: ExtractionRequest & {
        department?: string;
        subDepartment?: string;
      } = req.body;

      if (!image || !schema) {
        res.status(400).json({
          success: false,
          error: 'Image and schema are required',
          timestamp: Date.now()
        });
        return;
      }

      console.log(`🔬 Advanced VLM Analysis - Full Pipeline Debug Mode`);

      // Advanced analysis with all VLM providers
      const vlmRequest: FashionExtractionRequest = {
        image,
        schema,
        categoryName,
        discoveryMode: true, // Always enable discovery for advanced analysis
        department: department as any,
        subDepartment: subDepartment as any
      };

      // Get provider health status
      const providerHealth = await this.vlmService.checkProviderHealth();

      // Extract using Multi-VLM pipeline
      const result = await this.vlmService.extractFashionAttributes(vlmRequest);

      console.log(`🔬 Advanced VLM Analysis Complete - Confidence: ${result.confidence}%`);

      res.json({
        success: true,
        data: result,
        debug: {
          providerHealth,
          pipelineUsed: 'multi-vlm-advanced',
          analysisDepth: 'comprehensive'
        },
        metadata: {
          advancedMode: true,
          allProvidersUsed: true,
          fullDebugInfo: true
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Advanced VLM analysis failed:', error);
      next(error);
    }
  };

  /**
   * 📊 VLM System Health Check
   */
  vlmHealthCheck = async (req: Request, res: Response) => {
    try {
      const healthStatus = await this.vlmService.checkProviderHealth();
      const healthySystems = Object.values(healthStatus).filter(Boolean).length;
      const totalSystems = Object.keys(healthStatus).length;

      res.json({
        success: true,
        message: `VLM System Status: ${healthySystems}/${totalSystems} providers healthy`,
        data: {
          providers: healthStatus,
          systemHealth: healthySystems / totalSystems,
          recommendation: this.getSystemRecommendation(healthStatus)
        },
        timestamp: Date.now(),
        version: '2.0.0-vlm'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'VLM health check failed',
        timestamp: Date.now()
      });
    }
  };

  /**
   * ⚙️ Configure VLM Providers
   */
  configureVLMProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { providerId, config } = req.body;

      if (!providerId || !config) {
        res.status(400).json({
          success: false,
          error: 'Provider ID and configuration are required',
          timestamp: Date.now()
        });
        return;
      }

      await this.vlmService.configureProvider(providerId, config);

      res.json({
        success: true,
        message: `Provider ${providerId} configured successfully`,
        timestamp: Date.now()
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * 🔍 Get system recommendation based on provider health
   */
  private getSystemRecommendation(healthStatus: Record<string, boolean>): string {
    const healthy = Object.values(healthStatus).filter(Boolean).length;
    const total = Object.keys(healthStatus).length;

    if (healthy === total) {
      return 'All systems operational - optimal performance expected';
    } else if (healthy >= total * 0.75) {
      return 'Most systems operational - good performance expected';  
    } else if (healthy >= total * 0.5) {
      return 'Some systems down - reduced performance, fallbacks active';
    } else {
      return 'Multiple systems down - limited functionality, check configurations';
    }
  }
}