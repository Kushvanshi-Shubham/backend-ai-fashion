import { Request, Response, NextFunction } from 'express';
import { VLMService } from '../services/vlmService';
import { ExtractionService } from '../services/extractionService';
import type { SchemaItem } from '../types/extraction';

// Helper function to lookup category information
const getCategoryInfo = (categoryName: string): { department?: string; subDepartment?: string } => {
  if (!categoryName) return {};

  // Smart prefix-based department detection
  if (categoryName.startsWith('M_')) {
    return { department: 'MENS', subDepartment: 'MS_U' };
  } else if (categoryName.startsWith('W_')) {
    return { department: 'WOMENS', subDepartment: 'WS_U' };
  } else if (categoryName.startsWith('K_') || categoryName.startsWith('IBW_') || categoryName.startsWith('JBW_') || categoryName.startsWith('YBW_') || categoryName.startsWith('KBW_') || categoryName.startsWith('KIW_')) {
    return { department: 'KIDS', subDepartment: 'KS_U' };
  }

  // Explicit mappings for specific categories
  const categoryMap: Record<string, { department: string; subDepartment: string }> = {
    'M_TEES_HS': { department: 'MENS', subDepartment: 'MS_U' },
    // Add more specific mappings as needed
  };
  
  return categoryMap[categoryName] || {};
};

export class VLMController {
  private vlmService = new VLMService();
  private extractionService = new ExtractionService();

  /**
   * 🏥 VLM SYSTEM HEALTH CHECK
   * Returns status of all VLM providers
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = this.vlmService.getSystemHealth();
      
      res.json({
        success: true,
        message: 'VLM system health check completed',
        data: health,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'VLM health check failed',
        timestamp: Date.now()
      });
    }
  };

  /**
   * 🎯 VLM EXTRACTION WITH SMART FALLBACK
   * Uses best available VLM for fashion extraction
   */
  extractWithVLM = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { base64Image, schema, categoryName, customPrompt, discoveryMode } = req.body;

      if (!base64Image || !schema) {
        res.status(400).json({
          success: false,
          error: 'base64Image and schema are required',
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

      console.log(`🎯 VLM Extraction Request - Category: ${categoryName}, Discovery: ${discoveryMode}`);

      // Use existing extraction service with VLM fallback
      const result = await this.extractionService.extractWithDiscovery(
        base64Image,
        parsedSchema,
        categoryName,
        discoveryMode || false
      );

      res.json({
        success: true,
        data: {
          ...result,
          extractionMethod: 'vlm-fallback',
          availableProviders: this.vlmService.getAvailableProviders().map(p => p.name)
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('VLM extraction failed:', error);
      next(error);
    }
  };

  /**
   * 📊 GET AVAILABLE VLM PROVIDERS
   * Returns list of available VLM providers and their status
   */
  getProviders = async (req: Request, res: Response): Promise<void> => {
    try {
      const providers = this.vlmService.getAvailableProviders();
      const health = this.vlmService.getSystemHealth();

      res.json({
        success: true,
        data: {
          providers,
          systemHealth: health,
          totalAvailable: providers.length,
          fashionOptimized: providers.filter(p => p.fashionOptimized).length
        },
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get VLM providers',
        timestamp: Date.now()
      });
    }
  };

  /**
   * 🔄 REFRESH PROVIDER STATUS
   * Re-checks availability of all VLM providers
   */
  refreshProviders = async (req: Request, res: Response): Promise<void> => {
    try {
      // Reinitialize VLM service to check provider availability
      this.vlmService = new VLMService();
      
      // Wait a moment for async initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const health = this.vlmService.getSystemHealth();

      res.json({
        success: true,
        message: 'VLM providers refreshed successfully',
        data: health,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh VLM providers',
        timestamp: Date.now()
      });
    }
  };
}