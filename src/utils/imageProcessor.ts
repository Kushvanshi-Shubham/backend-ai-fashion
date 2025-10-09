export class ImageProcessor {
  static async processImageToBase64(file: Express.Multer.File): Promise<string> {
    try {
      const imageBuffer = file.buffer;
      const base64String = imageBuffer.toString('base64');
      const mimeType = file.mimetype;
      
      return `data:${mimeType};base64,${base64String}`;
    } catch (error) {
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
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