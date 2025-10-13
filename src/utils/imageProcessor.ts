export class ImageProcessor {
  // 🎯 ENHANCED IMAGE PROCESSING FOR BETTER AI ANALYSIS
  static async processImageToBase64(file: Express.Multer.File): Promise<string> {
    try {
      const imageBuffer = file.buffer;
      
      // Apply AI-optimized preprocessing
      const enhancedBuffer = await this.enhanceImageForAI(imageBuffer, file.mimetype);
      
      const base64String = enhancedBuffer.toString('base64');
      const mimeType = file.mimetype;
      
      console.log(`📸 Enhanced image: ${file.originalname} (${(enhancedBuffer.length / 1024).toFixed(1)}KB)`);
      
      return `data:${mimeType};base64,${base64String}`;
    } catch (error) {
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 🚀 AI-OPTIMIZED IMAGE ENHANCEMENT WITH SHARP.JS
  private static async enhanceImageForAI(buffer: Buffer, mimeType: string): Promise<Buffer> {
    try {
      // Import Sharp dynamically to handle missing dependency gracefully
      let sharp;
      try {
        sharp = require('sharp');
      } catch (error) {
        console.log('📦 Sharp.js not installed, using original image');
        return buffer;
      }
      
      console.log(`🔧 Enhancing image: ${mimeType} (${(buffer.length / 1024).toFixed(1)}KB)`);
      
      const enhancedBuffer = await sharp(buffer)
        // 1. Resize for optimal VLM processing (GPT-4V works best with 512-2048px)
        .resize(1024, 1024, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        // 2. Enhance contrast for label/tag visibility
        .modulate({
          brightness: 1.1,  // Slightly brighter
          saturation: 1.2,  // More vivid colors
          hue: 0           // Keep original hue
        })
        // 3. Sharpen for fabric texture details
        .sharpen({
          sigma: 1.5,      // Moderate sharpening
          m1: 1.0,         // Threshold
          m2: 2.0,         // Slope
          x1: 2.0,         // Threshold point
          y2: 10.0,        // Maximum gain
          y3: 20.0         // Maximum gain at edges
        })
        // 4. Normalize contrast and lighting
        .normalize()
        // 5. Output in high quality JPEG
        .jpeg({ 
          quality: 92,     // High quality
          progressive: false,
          mozjpeg: true    // Better compression
        })
        .toBuffer();
      
      const originalSize = (buffer.length / 1024).toFixed(1);
      const enhancedSize = (enhancedBuffer.length / 1024).toFixed(1);
      
      console.log(`✨ Image enhanced: ${originalSize}KB → ${enhancedSize}KB`);
      console.log(`  ✅ Resized to optimal VLM dimensions`);
      console.log(`  ✅ Enhanced contrast for label visibility`);
      console.log(`  ✅ Sharpened for fabric texture details`);
      console.log(`  ✅ Normalized lighting and colors`);
      
      return enhancedBuffer;
      
    } catch (error) {
      console.error('⚠️ Image enhancement failed, using original:', error);
      return buffer;
    }
  }

  // 🔍 MULTI-CROP ANALYSIS FOR COMPREHENSIVE EXTRACTION
  static async generateMultipleCrops(buffer: Buffer): Promise<{
    fullImage: Buffer;
    topSection: Buffer;
    centerSection: Buffer;
    bottomSection: Buffer;
    labelFocus?: Buffer;
  }> {
    try {
      let sharp;
      try {
        sharp = require('sharp');
      } catch (error) {
        console.log('📦 Sharp.js not installed, returning original image only');
        return {
          fullImage: buffer,
          topSection: buffer,
          centerSection: buffer,
          bottomSection: buffer
        };
      }

      const image = sharp(buffer);
      const { width, height } = await image.metadata();
      
      if (!width || !height) {
        throw new Error('Could not get image dimensions');
      }

      console.log(`🔍 Generating multi-crops for ${width}x${height} image`);

      // Enhanced full image
      const fullImage = await this.enhanceImageForAI(buffer, 'image/jpeg');

      // Top section (0-40% height) - for labels, brand info
      const topSection = await image
        .extract({ 
          left: 0, 
          top: 0, 
          width: width, 
          height: Math.floor(height * 0.4) 
        })
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .modulate({ brightness: 1.2, saturation: 1.3 }) // Extra enhancement for text
        .sharpen()
        .normalize()
        .jpeg({ quality: 95 })
        .toBuffer();

      // Center section (30-70% height) - main garment details
      const centerSection = await image
        .extract({ 
          left: 0, 
          top: Math.floor(height * 0.3), 
          width: width, 
          height: Math.floor(height * 0.4) 
        })
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .modulate({ brightness: 1.1, saturation: 1.2 })
        .sharpen()
        .normalize()
        .jpeg({ quality: 92 })
        .toBuffer();

      // Bottom section (60-100% height) - construction details, hem
      const bottomSection = await image
        .extract({ 
          left: 0, 
          top: Math.floor(height * 0.6), 
          width: width, 
          height: Math.floor(height * 0.4) 
        })
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .modulate({ brightness: 1.1, saturation: 1.2 })
        .sharpen()
        .normalize()
        .jpeg({ quality: 92 })
        .toBuffer();

      console.log('✅ Generated 4 image crops for comprehensive analysis');
      
      return {
        fullImage,
        topSection,
        centerSection,
        bottomSection
      };

    } catch (error) {
      console.error('⚠️ Multi-crop generation failed:', error);
      return {
        fullImage: buffer,
        topSection: buffer,
        centerSection: buffer,
        bottomSection: buffer
      };
    }
  }

  static validateImageFile(file: Express.Multer.File): void {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }
  }

  static getImageInfo(file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      sizeFormatted: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }
}

// 🚀 STANDALONE FUNCTIONS FOR MULTI-CROP ANALYSIS
export interface ImageCrop {
  image: string; // base64 encoded
  section: 'full' | 'top' | 'center' | 'bottom';
}

export async function enhanceImageForAI(base64Image: string): Promise<string> {
  try {
    // Extract base64 data from data URL
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.log('📦 Sharp.js not installed, using original image');
      return base64Image;
    }
    
    console.log('🔧 Enhancing image for AI analysis...');
    
    const enhancedBuffer = await sharp(buffer)
      // Resize for optimal VLM processing
      .resize(1024, 1024, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      // Enhance contrast and colors
      .modulate({
        brightness: 1.1,
        saturation: 1.2,
        hue: 0
      })
      // Sharpen for details
      .sharpen({
        sigma: 1.5,
        m1: 1.0,
        m2: 2.0,
        x1: 2.0,
        y2: 10.0,
        y3: 20.0
      })
      // Normalize lighting
      .normalize()
      // Output high quality JPEG
      .jpeg({ 
        quality: 92,
        progressive: false,
        mozjpeg: true
      })
      .toBuffer();
    
    const enhancedBase64 = enhancedBuffer.toString('base64');
    console.log('✨ Image enhanced for AI analysis');
    
    return `data:image/jpeg;base64,${enhancedBase64}`;
    
  } catch (error) {
    console.error('⚠️ Image enhancement failed:', error);
    return base64Image;
  }
}

export async function generateMultipleCrops(base64Image: string): Promise<ImageCrop[]> {
  try {
    // Extract base64 data from data URL
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.log('📦 Sharp.js not installed, returning original image only');
      return [{ image: base64Image, section: 'full' }];
    }

    const image = sharp(buffer);
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      throw new Error('Could not get image dimensions');
    }

    console.log(`🔍 Generating multi-crops for ${width}x${height} image`);

    // Enhanced full image
    const fullImage = await enhanceImageForAI(base64Image);

    // Top section (0-40% height) - for labels, brand info, necklines
    const topSectionBuffer = await image
      .extract({ 
        left: 0, 
        top: 0, 
        width: width, 
        height: Math.floor(height * 0.4) 
      })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .modulate({ brightness: 1.2, saturation: 1.3 }) // Extra enhancement for text
      .sharpen()
      .normalize()
      .jpeg({ quality: 95 })
      .toBuffer();
    
    const topSection = `data:image/jpeg;base64,${topSectionBuffer.toString('base64')}`;

    // Center section (30-70% height) - main garment details, fabric, sleeves
    const centerSectionBuffer = await image
      .extract({ 
        left: 0, 
        top: Math.floor(height * 0.3), 
        width: width, 
        height: Math.floor(height * 0.4) 
      })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .modulate({ brightness: 1.1, saturation: 1.2 })
      .sharpen()
      .normalize()
      .jpeg({ quality: 92 })
      .toBuffer();
    
    const centerSection = `data:image/jpeg;base64,${centerSectionBuffer.toString('base64')}`;

    // Bottom section (60-100% height) - construction details, hem, length
    const bottomSectionBuffer = await image
      .extract({ 
        left: 0, 
        top: Math.floor(height * 0.6), 
        width: width, 
        height: Math.floor(height * 0.4) 
      })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .modulate({ brightness: 1.1, saturation: 1.2 })
      .sharpen()
      .normalize()
      .jpeg({ quality: 92 })
      .toBuffer();
    
    const bottomSection = `data:image/jpeg;base64,${bottomSectionBuffer.toString('base64')}`;

    console.log('✅ Generated 4 image sections for comprehensive analysis');
    
    return [
      { image: fullImage, section: 'full' },
      { image: topSection, section: 'top' },
      { image: centerSection, section: 'center' },
      { image: bottomSection, section: 'bottom' }
    ];

  } catch (error) {
    console.error('⚠️ Multi-crop generation failed:', error);
    return [{ image: base64Image, section: 'full' }];
  }
}