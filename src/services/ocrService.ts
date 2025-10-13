import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    words: string[];
  }>;
}

export interface ExtractedLabels {
  sizeLabels: string[];
  brandLabels: string[];
  careLabels: string[];
  materialLabels: string[];
  countryLabels: string[];
  priceLabels: string[];
  generalText: string[];
  confidence: number;
}

export class OCRService {
  private worker: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔍 Initializing Tesseract OCR worker...');
      this.worker = await createWorker('eng');
      
      // Configure for better fashion label recognition
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%/-.,: ',
        tessedit_pageseg_mode: '6', // Uniform block of text
        preserve_interword_spaces: '1'
      });
      
      this.isInitialized = true;
      console.log('✅ OCR worker initialized successfully');
    } catch (error) {
      console.error('❌ OCR initialization failed:', error);
      throw new Error(`OCR initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('🛑 OCR worker terminated');
    }
  }

  // 🔍 MAIN OCR EXTRACTION WITH PREPROCESSING
  async extractTextFromImage(imageBuffer: Buffer): Promise<OCRResult> {
    await this.initialize();

    try {
      console.log('🔍 Preprocessing image for OCR...');
      
      // Enhance image for better OCR recognition
      const enhancedBuffer = await this.preprocessForOCR(imageBuffer);
      
      console.log('📖 Running OCR text extraction...');
      const { data } = await this.worker.recognize(enhancedBuffer);
      
      const result: OCRResult = {
        text: data.text.trim(),
        confidence: data.confidence,
        words: data.words?.map((word: any) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })) || [],
        lines: data.lines?.map((line: any) => ({
          text: line.text,
          confidence: line.confidence,
          words: line.words?.map((w: any) => w.text) || []
        })) || []
      };

      console.log(`✅ OCR completed - Confidence: ${result.confidence}%, Text length: ${result.text.length}`);
      return result;
    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 🧠 INTELLIGENT LABEL EXTRACTION FROM OCR TEXT
  async extractFashionLabels(imageBuffer: Buffer): Promise<ExtractedLabels> {
    const ocrResult = await this.extractTextFromImage(imageBuffer);
    
    console.log('🏷️ Analyzing OCR text for fashion labels...');
    
    const labels: ExtractedLabels = {
      sizeLabels: [],
      brandLabels: [],
      careLabels: [],
      materialLabels: [],
      countryLabels: [],
      priceLabels: [],
      generalText: [],
      confidence: ocrResult.confidence
    };

    // Process each line and word for label detection
    const allText = ocrResult.text.toLowerCase();
    const lines = ocrResult.lines.map(line => line.text.trim()).filter(line => line.length > 0);
    const words = ocrResult.words.map(word => word.text.trim()).filter(word => word.length > 0);

    // Size label detection (more comprehensive)
    const sizePatterns = [
      /\b(xxs|xs|sm?|med?|lg?|xl|xxl|xxxl)\b/gi,
      /\b(extra\s*small|small|medium|large|extra\s*large)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(?:inch|in|cm|mm)\b/gi,
      /\b(size\s*:?\s*(\w+))/gi,
      /\b(\d{1,2}(?:\.\d)?)\s*(?:us|uk|eu)?\b/gi,
      /\b(0[02468]|[13579][02468]?)\b/g // Common numeric sizes
    ];

    sizePatterns.forEach(pattern => {
      const matches = allText.match(pattern) || [];
      labels.sizeLabels.push(...matches.map(m => m.trim().toUpperCase()));
    });

    // Brand detection (look for common brand indicators)
    const brandPatterns = [
      /\b(brand\s*:?\s*(\w+))/gi,
      /\b(made\s*by\s*(\w+))/gi,
      /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g // All caps words (potential brands)
    ];

    brandPatterns.forEach(pattern => {
      const matches = allText.match(pattern) || [];
      labels.brandLabels.push(...matches.map(m => m.trim()));
    });

    // Care instruction detection
    const carePatterns = [
      /\b(machine\s*wash|hand\s*wash|dry\s*clean|do\s*not\s*wash)\b/gi,
      /\b(tumble\s*dry|hang\s*dry|do\s*not\s*tumble\s*dry)\b/gi,
      /\b(iron|do\s*not\s*iron|low\s*heat|medium\s*heat|high\s*heat)\b/gi,
      /\b(bleach|do\s*not\s*bleach|non\s*chlorine\s*bleach)\b/gi,
      /\b(\d{2,3}°?[CF]?)\b/g // Temperature indicators
    ];

    carePatterns.forEach(pattern => {
      const matches = allText.match(pattern) || [];
      labels.careLabels.push(...matches.map(m => m.trim()));
    });

    // Material/fabric detection
    const materialPatterns = [
      /\b(\d+%?\s*cotton|cotton\s*\d+%?)\b/gi,
      /\b(\d+%?\s*polyester|polyester\s*\d+%?)\b/gi,
      /\b(\d+%?\s*wool|wool\s*\d+%?)\b/gi,
      /\b(\d+%?\s*silk|silk\s*\d+%?)\b/gi,
      /\b(\d+%?\s*linen|linen\s*\d+%?)\b/gi,
      /\b(\d+%?\s*spandex|spandex\s*\d+%?)\b/gi,
      /\b(\d+%?\s*elastane|elastane\s*\d+%?)\b/gi,
      /\b(\d+%?\s*viscose|viscose\s*\d+%?)\b/gi,
      /\b(100%\s*\w+)\b/gi
    ];

    materialPatterns.forEach(pattern => {
      const matches = allText.match(pattern) || [];
      labels.materialLabels.push(...matches.map(m => m.trim()));
    });

    // Country of origin detection
    const countryPatterns = [
      /\b(made\s*in\s*(\w+(?:\s+\w+)?))/gi,
      /\b(manufactured\s*in\s*(\w+(?:\s+\w+)?))/gi,
      /\b(origin\s*:?\s*(\w+(?:\s+\w+)?))/gi
    ];

    countryPatterns.forEach(pattern => {
      const matches = allText.match(pattern) || [];
      labels.countryLabels.push(...matches.map(m => m.trim()));
    });

    // Price detection
    const pricePatterns = [
      /\$\d+(?:\.\d{2})?/g,
      /\b\d+(?:\.\d{2})?\s*(?:usd|eur|gbp|inr)\b/gi,
      /\b(price\s*:?\s*[\$€£₹]?\d+(?:\.\d{2})?)/gi
    ];

    pricePatterns.forEach(pattern => {
      const matches = allText.match(pattern) || [];
      labels.priceLabels.push(...matches.map(m => m.trim()));
    });

    // General text (non-categorized meaningful text)
    lines.forEach(line => {
      if (line.length > 2 && !this.isLabelCategorized(line, labels)) {
        labels.generalText.push(line);
      }
    });

    // Remove duplicates and clean up
    Object.keys(labels).forEach(key => {
      if (Array.isArray(labels[key as keyof ExtractedLabels])) {
        const arr = labels[key as keyof ExtractedLabels] as string[];
        labels[key as keyof ExtractedLabels] = [...new Set(arr.filter(item => item.length > 1))] as any;
      }
    });

    const totalLabels = Object.values(labels).flat().length - 1; // Exclude confidence
    console.log(`🏷️ Extracted ${totalLabels} labels from OCR text`);
    
    return labels;
  }

  // 🖼️ IMAGE PREPROCESSING FOR BETTER OCR
  private async preprocessForOCR(buffer: Buffer): Promise<Buffer> {
    try {
      const enhancedBuffer = await sharp(buffer)
        // Resize to optimal OCR resolution
        .resize(2048, 2048, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        // Convert to grayscale for better text recognition
        .greyscale()
        // Increase brightness for text clarity
        .modulate({
          brightness: 1.2,
          saturation: 1.0
        })
        // Apply contrast enhancement using linear transform
        .linear(1.5, -(128 * 1.5) + 128)
        // Sharpen text edges
        .sharpen({
          sigma: 1.0,
          m1: 1.0,
          m2: 2.0,
          x1: 2.0,
          y2: 10.0,
          y3: 20.0
        })
        // Normalize lighting
        .normalize()
        // Output as high-quality PNG for OCR
        .png({ quality: 95, compressionLevel: 0 })
        .toBuffer();

      console.log('✅ Image preprocessed for OCR');
      return enhancedBuffer;
    } catch (error) {
      console.warn('⚠️ OCR preprocessing failed, using original image:', error);
      return buffer;
    }
  }

  // Helper to check if text is already categorized
  private isLabelCategorized(text: string, labels: ExtractedLabels): boolean {
    const allLabels = [
      ...labels.sizeLabels,
      ...labels.brandLabels,
      ...labels.careLabels,
      ...labels.materialLabels,
      ...labels.countryLabels,
      ...labels.priceLabels
    ];
    
    return allLabels.some(label => 
      text.toLowerCase().includes(label.toLowerCase()) ||
      label.toLowerCase().includes(text.toLowerCase())
    );
  }

  // 🔍 MULTI-CROP OCR ANALYSIS
  async extractLabelsFromMultipleCrops(imageBuffer: Buffer): Promise<{
    fullImage: ExtractedLabels;
    topSection: ExtractedLabels;
    centerSection: ExtractedLabels;
    bottomSection: ExtractedLabels;
    consolidatedLabels: ExtractedLabels;
  }> {
    try {
      console.log('🔍 Starting multi-crop OCR analysis...');
      
      // Generate image crops using Sharp
      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();
      
      if (!width || !height) {
        throw new Error('Could not get image dimensions for OCR');
      }

      // Create crops for different sections
      const [fullImageLabels, topSectionLabels, centerSectionLabels, bottomSectionLabels] = await Promise.all([
        // Full image OCR
        this.extractFashionLabels(imageBuffer),
        
        // Top section (0-40% height) - labels, brand info
        this.extractFashionLabels(
          await image.clone()
            .extract({ 
              left: 0, 
              top: 0, 
              width: width, 
              height: Math.floor(height * 0.4) 
            })
            .png()
            .toBuffer()
        ),
        
        // Center section (30-70% height) - main garment info
        this.extractFashionLabels(
          await image.clone()
            .extract({ 
              left: 0, 
              top: Math.floor(height * 0.3), 
              width: width, 
              height: Math.floor(height * 0.4) 
            })
            .png()
            .toBuffer()
        ),
        
        // Bottom section (60-100% height) - care labels, size tags
        this.extractFashionLabels(
          await image.clone()
            .extract({ 
              left: 0, 
              top: Math.floor(height * 0.6), 
              width: width, 
              height: Math.floor(height * 0.4) 
            })
            .png()
            .toBuffer()
        )
      ]);

      // Consolidate results - merge all unique labels
      const consolidatedLabels: ExtractedLabels = {
        sizeLabels: [...new Set([
          ...fullImageLabels.sizeLabels,
          ...topSectionLabels.sizeLabels,
          ...centerSectionLabels.sizeLabels,
          ...bottomSectionLabels.sizeLabels
        ])],
        brandLabels: [...new Set([
          ...fullImageLabels.brandLabels,
          ...topSectionLabels.brandLabels,
          ...centerSectionLabels.brandLabels,
          ...bottomSectionLabels.brandLabels
        ])],
        careLabels: [...new Set([
          ...fullImageLabels.careLabels,
          ...topSectionLabels.careLabels,
          ...centerSectionLabels.careLabels,
          ...bottomSectionLabels.careLabels
        ])],
        materialLabels: [...new Set([
          ...fullImageLabels.materialLabels,
          ...topSectionLabels.materialLabels,
          ...centerSectionLabels.materialLabels,
          ...bottomSectionLabels.materialLabels
        ])],
        countryLabels: [...new Set([
          ...fullImageLabels.countryLabels,
          ...topSectionLabels.countryLabels,
          ...centerSectionLabels.countryLabels,
          ...bottomSectionLabels.countryLabels
        ])],
        priceLabels: [...new Set([
          ...fullImageLabels.priceLabels,
          ...topSectionLabels.priceLabels,
          ...centerSectionLabels.priceLabels,
          ...bottomSectionLabels.priceLabels
        ])],
        generalText: [...new Set([
          ...fullImageLabels.generalText,
          ...topSectionLabels.generalText,
          ...centerSectionLabels.generalText,
          ...bottomSectionLabels.generalText
        ])],
        confidence: Math.max(
          fullImageLabels.confidence,
          topSectionLabels.confidence,
          centerSectionLabels.confidence,
          bottomSectionLabels.confidence
        )
      };

      const totalLabels = Object.values(consolidatedLabels).flat().length - 1;
      console.log(`✅ Multi-crop OCR complete: ${totalLabels} consolidated labels`);

      return {
        fullImage: fullImageLabels,
        topSection: topSectionLabels,
        centerSection: centerSectionLabels,
        bottomSection: bottomSectionLabels,
        consolidatedLabels
      };
    } catch (error) {
      console.error('❌ Multi-crop OCR analysis failed:', error);
      // Fallback to single image OCR
      const fallbackLabels = await this.extractFashionLabels(imageBuffer);
      return {
        fullImage: fallbackLabels,
        topSection: fallbackLabels,
        centerSection: fallbackLabels,
        bottomSection: fallbackLabels,
        consolidatedLabels: fallbackLabels
      };
    }
  }
}

export const ocrService = new OCRService();