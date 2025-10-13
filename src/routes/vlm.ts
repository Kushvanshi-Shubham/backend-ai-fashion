import { Router } from 'express';
import { VLMController } from '../controllers/vlmController';
import { validateRequest } from '../middleware/errorHandler';

const router = Router();
const vlmController = new VLMController();

// 🏥 VLM System Health Check
router.get('/health', vlmController.healthCheck);

// 📊 Get Available VLM Providers
router.get('/providers', vlmController.getProviders);

// 🔄 Refresh Provider Status
router.post('/refresh', vlmController.refreshProviders);

// 🎯 VLM Extraction with Smart Fallback
router.post('/extract', 
  validateRequest, 
  vlmController.extractWithVLM
);

export default router;