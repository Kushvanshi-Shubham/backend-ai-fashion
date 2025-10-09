// 🚀 Queue Routes - API endpoints for queue operations

import { Router } from 'express';
import { QueueController } from '../controllers/queueController';

const router = Router();
const queueController = new QueueController();

// 🎯 Submit job to processing queue
router.post('/submit', 
  queueController.submitExtractionJob
);

// 🎯 Get job status (for frontend polling)
router.get('/status/:jobId', 
  queueController.getJobStatus
);

// 🎯 Get queue overview (for monitoring)
router.get('/overview', 
  queueController.getQueueOverview
);

// 🎯 Queue health check
router.get('/health', 
  queueController.healthCheck
);

export default router;