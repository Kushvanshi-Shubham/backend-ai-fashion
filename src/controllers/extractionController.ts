import { Request, Response, NextFunction } from 'express';
import { ExtractionService } from '../services/extractionService';
import { ImageProcessor } from '../utils/imageProcessor';
import type { SchemaItem, ExtractionRequest } from '../types/extraction';
import prisma from '../services/db';

// Import category definitions to lookup department/subDepartment
interface CategoryDefinition {
  id: string;
  department: string;
  subDepartment: string;
  category: string;
  displayName: string;
  description: string;
}

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

export class ExtractionController {
  private extractionService = new ExtractionService();

  // � OCR-ONLY TEXT EXTRACTION
  extractOCRLabels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided',
          timestamp: Date.now()
        });
        return;
      }

      ImageProcessor.validateImageFile(req.file);
      
      console.log('📖 Starting OCR-only extraction...');
      
      // Import OCR service
      const { OCRService } = await import('../services/ocrService');
      const ocrService = new OCRService();
      
      const startTime = Date.now();
      
      // Extract labels from image
      const ocrResults = await ocrService.extractLabelsFromMultipleCrops(req.file.buffer);
      
      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          ocrLabels: ocrResults.consolidatedLabels,
          sectionResults: {
            fullImage: ocrResults.fullImage,
            topSection: ocrResults.topSection,
            centerSection: ocrResults.centerSection,
            bottomSection: ocrResults.bottomSection
          },
          processingTime,
          confidence: ocrResults.consolidatedLabels.confidence
        },
        metadata: {
          processingTime,
          labelsFound: Object.values(ocrResults.consolidatedLabels).flat().length - 1,
          sections: 4
        },
        timestamp: Date.now()
      });

      // Cleanup OCR resources
      await ocrService.terminate();

    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'OCR extraction failed',
        timestamp: Date.now()
      });
    }
  };

  // �🔍 MULTI-CROP ENHANCED EXTRACTION
  extractWithMultiCrop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided',
          timestamp: Date.now()
        });
        return;
      }

      ImageProcessor.validateImageFile(req.file);

      const { schema, categoryName, department, subDepartment } = req.body;
      
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

      console.log('🔍 Starting multi-crop extraction...');
      
      // Convert image to base64 for multi-crop analysis
      const base64Image = await ImageProcessor.processImageToBase64(req.file);
      
      // Analyze with multi-crop enhancement
      const results = await this.extractionService.extractWithMultiCrop(
        base64Image,
        parsedSchema,
        categoryName,
        true, // Enable discovery mode for multi-crop
        department,
        subDepartment
      );

      res.json({
        success: true,
        data: results,
        metadata: {
          processingTime: results.processingTime,
          confidence: results.confidence,
          tokensUsed: results.tokensUsed,
          modelUsed: results.modelUsed
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Multi-crop extraction failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Multi-crop extraction failed',
        timestamp: Date.now()
      });
    }
  };

  extractFromUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      // Persist upload record (memory upload)
      const userId = (req as any).user?.sub ?? null;
      const upload = await prisma.upload.create({
        data: {
          filename: req.file.originalname,
          path: 'memory',
          status: 'PROCESSING',
          userId: userId,
        }
      });

      // Parse the request body
      const { schema, categoryName, customPrompt, discoveryMode } = req.body;
      
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

      // Extract attributes and persist result
      try {
        // Lookup department/subDepartment information from category
        const { department, subDepartment } = getCategoryInfo(categoryName || '');
        console.log(`🏢 Category Info: ${categoryName} → Dept: ${department}, SubDept: ${subDepartment}`);

        const result = discoveryMode === 'true' || discoveryMode === true
          ? await this.extractionService.extractWithDiscovery(
              base64Image,
              parsedSchema,
              categoryName,
              true, // discoveryMode
              department,
              subDepartment
            )
          : await this.extractionService.extractWithDiscovery(
              base64Image,
              parsedSchema,
              categoryName,
              false, // not discoveryMode
              department,
              subDepartment
            );

        await prisma.extractionResult.create({
          data: {
            uploadId: upload.id,
            data: JSON.parse(JSON.stringify(result)),
            rawOutput: JSON.stringify(result),
          }
        });

        await prisma.upload.update({ where: { id: upload.id }, data: { status: 'COMPLETED' } });

        res.json({ success: true, data: result, timestamp: Date.now() });
      } catch (err) {
        await prisma.upload.update({ where: { id: upload.id }, data: { status: 'FAILED' } });
        throw err;
      }

    } catch (error) {
      next(error);
    }
  };

  extractFromBase64 = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { image, schema, categoryName, customPrompt, discoveryMode }: ExtractionRequest = req.body;

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

      // 🔧 OPTIMIZED: Use single method with discovery flag for consistency
      console.log(`🔍 Extraction Request - Discovery Mode: ${discoveryMode}, Schema Items: ${schema.length}`);

      // Persist upload record for base64 input
      const userId = (req as any).user?.sub ?? null;
      const upload = await prisma.upload.create({ data: { filename: 'base64-upload', path: 'base64', status: 'PROCESSING', userId } });

      try {
        const result = await this.extractionService.extractWithDiscovery(
          image,
          schema,
          categoryName,
          discoveryMode || false // Ensure boolean, default to false
        );

  await prisma.extractionResult.create({ data: { uploadId: upload.id, data: JSON.parse(JSON.stringify(result)), rawOutput: JSON.stringify(result) } });
        await prisma.upload.update({ where: { id: upload.id }, data: { status: 'COMPLETED' } });

        console.log('✅ Extraction successful, sending result with attributes:', Object.keys(result.attributes || {}).length);
        res.json({ success: true, data: result, timestamp: Date.now() });
      } catch (err) {
        await prisma.upload.update({ where: { id: upload.id }, data: { status: 'FAILED' } });
        throw err;
      }

    } catch (error) {
      next(error);
    }
  };

  extractWithDebug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { image, schema, categoryName }: ExtractionRequest = req.body;

      if (!image || !schema) {
        res.status(400).json({
          success: false,
          error: 'Image and schema are required',
          timestamp: Date.now()
        });
        return;
      }

      const result = await this.extractionService.extractWithDebug(
        image,
        schema,
        categoryName
      );

      res.json({
        success: true,
        data: result,
        timestamp: Date.now()
      });

    } catch (error) {
      next(error);
    }
  };

  healthCheck = async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'AI Fashion Extractor API is running',
      timestamp: Date.now(),
      version: '1.0.0'
    });
  };
}