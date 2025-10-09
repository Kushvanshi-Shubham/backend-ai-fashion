import { Request, Response, NextFunction } from 'express';
import prisma from '../services/db';

export class UploadsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const pageSize = Math.min(parseInt((req.query.pageSize as string) || '20'), 100);

      const uploads = await prisma.upload.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { extractionResults: { take: 1, orderBy: { createdAt: 'desc' } } }
      });

      res.json({ success: true, data: uploads });
    } catch (err) {
      next(err);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'id required' });
        return;
      }

      const upload = await prisma.upload.findUnique({ where: { id }, include: { extractionResults: true } });
      if (!upload) {
        res.status(404).json({ success: false, error: 'Upload not found' });
        return;
      }

      res.json({ success: true, data: upload });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  async update(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const payload = req.body;
      if (!id) {
        res.status(400).json({ success: false, error: 'id required' });
        return;
      }

      const existing = await prisma.upload.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, error: 'Upload not found' });
        return;
      }

      // Authorization: owner or admin
      const userId = req.user?.sub;
      const role = req.user?.role;
      if (existing.userId && userId !== existing.userId && role !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      const allowed: any = {};
      if (typeof payload.status === 'string') allowed.status = payload.status;
      if (typeof payload.filename === 'string') allowed.filename = payload.filename;

      const updated = await prisma.upload.update({ where: { id }, data: allowed });
      res.json({ success: true, data: updated });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  async remove(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'id required' });
        return;
      }

      const existing = await prisma.upload.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, error: 'Upload not found' });
        return;
      }

      // Authorization: owner or admin
      const userId = req.user?.sub;
      const role = req.user?.role;
      if (existing.userId && userId !== existing.userId && role !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      // Delete related extractionResults first
      await prisma.extractionResult.deleteMany({ where: { uploadId: id } });
      await prisma.upload.delete({ where: { id } });

      res.json({ success: true });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
}
