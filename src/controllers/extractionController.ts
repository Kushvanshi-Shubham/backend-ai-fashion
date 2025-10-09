import { Request, Response, NextFunction } from 'express';
import { ExtractionService } from '../services/extractionService';
import { ImageProcessor } from '../utils/imageProcessor';
import type { SchemaItem, ExtractionRequest } from '../types/extraction';
import prisma from '../services/db';

export class ExtractionController {
  private extractionService = new ExtractionService();

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
        const result = discoveryMode === 'true' || discoveryMode === true
          ? await this.extractionService.extractWithDiscovery(
              base64Image,
              parsedSchema,
              categoryName
            )
          : await this.extractionService.extractAttributes(
              base64Image,
              parsedSchema,
              customPrompt,
              categoryName
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