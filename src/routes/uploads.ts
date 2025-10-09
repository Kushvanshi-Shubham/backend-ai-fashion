import { Router } from 'express';
import { UploadsController } from '../controllers/uploadsController';
import { requireAuth } from '../middleware/auth';

const router = Router();
const controller = new UploadsController();

router.get('/', controller.list);
router.get('/:id', controller.get);
router.patch('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.remove);

export default router;
