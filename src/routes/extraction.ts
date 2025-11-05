import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { ExtractionController } from '../controllers/extractionController';
import { EnhancedExtractionController } from '../controllers/enhancedExtractionController';
import { validateRequest } from '../middleware/errorHandler';

const router = Router();
const extractionController = new ExtractionController();
const vlmController = new EnhancedExtractionController();

// Stricter rate limit for extraction endpoints (expensive operations)
const extractionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 extractions per 15 minutes per IP
  message: {
    success: false,
    error: '⚠️ Extraction limit reached. You can perform 50 extractions every 15 minutes. Please wait before trying again.',
    timestamp: Date.now()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler for better logging
  handler: (req, res) => {
    console.warn(`🚫 Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      error: '⚠️ Too many extraction requests. Please wait 15 minutes before trying again.',
      retryAfter: '15 minutes',
      timestamp: Date.now()
    });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '15728640'), // 15MB default (matches frontend)
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

// Health check route (no rate limiting)
router.get('/health', extractionController.healthCheck);

// Extract attributes from uploaded file (Enhanced VLM Pipeline)
router.post('/extract/upload', 
  extractionLimiter,
  upload.single('image'), 
  validateRequest, 
  vlmController.extractFromUploadVLM
);

// Legacy upload extraction (Old OpenAI only)
router.post('/extract/upload/legacy', 
  extractionLimiter,
  upload.single('image'), 
  validateRequest, 
  extractionController.extractFromUpload
);

// Extract attributes from base64 image (Enhanced VLM Pipeline)
router.post('/extract/base64', 
  extractionLimiter,
  validateRequest, 
  vlmController.extractFromBase64VLM
);

// Legacy base64 extraction (Old OpenAI only)
router.post('/extract/base64/legacy', 
  extractionLimiter,
  validateRequest, 
  extractionController.extractFromBase64
);

// VLM Health Check Routes
router.get('/vlm/health', vlmController.vlmHealthCheck);

// 🎯 NEW: Database-Driven Category-Based Extraction
router.get('/categories/hierarchy', vlmController.getCategoryHierarchy);
router.get('/categories/:code/schema', vlmController.getCategorySchema);
router.get('/categories/search', vlmController.searchCategories);

// Category-based extraction with database schema
router.post('/extract/category', 
  extractionLimiter,
  validateRequest, 
  vlmController.extractFromCategoryCode
);

export default router;