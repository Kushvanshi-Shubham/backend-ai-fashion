import { Router } from 'express';
import prisma from '../services/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/stats', requireAuth, async (req, res) => {
  try {
    // only admin
    const role = (req as { user?: { role: string } }).user?.role;
    if (role !== 'ADMIN') return res.status(403).json({ success: false, error: 'Forbidden' });

    const totalUploads = await prisma.upload.count();
    const completed = await prisma.upload.count({ where: { status: 'COMPLETED' } });
    const failed = await prisma.upload.count({ where: { status: 'FAILED' } });
    const pending = await prisma.upload.count({ where: { status: 'PROCESSING' } });

    return res.json({ success: true, data: { totalUploads, completed, failed, pending } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;