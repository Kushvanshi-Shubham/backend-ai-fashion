import { Router } from 'express';
import multer from 'multer';
import { ExtractionController } from '../controllers/extractionController';
import { EnhancedExtractionController } from '../controllers/enhancedExtractionController';
import { validateRequest } from '../middleware/errorHandler';

const router = Router();
const extractionController = new ExtractionController();
const vlmController = new EnhancedExtractionController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Health check route
router.get('/health', extractionController.healthCheck);

// Extract attributes from uploaded file (Enhanced VLM Pipeline)
router.post('/extract/upload', 
  upload.single('image'), 
  validateRequest, 
  vlmController.extractFromUploadVLM
);

// Legacy upload extraction (Old OpenAI only)
router.post('/extract/upload/legacy', 
  upload.single('image'), 
  validateRequest, 
  extractionController.extractFromUpload
);

// Extract attributes from base64 image (Enhanced VLM Pipeline)
router.post('/extract/base64', 
  validateRequest, 
  vlmController.extractFromBase64VLM
);

// Legacy base64 extraction (Old OpenAI only)
router.post('/extract/base64/legacy', 
  validateRequest, 
  extractionController.extractFromBase64
);

// Extract with debug information
router.post('/extract/debug', 
  validateRequest, 
  extractionController.extractWithDebug
);

// VLM Health Check Routes
router.get('/vlm/health', vlmController.vlmHealthCheck);

export default router;