import { Router, Request, Response } from 'express';
import { cacheService } from '../services/cacheService';

const router = Router();

/**
 * 📊 Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      timestamp: Date.now()
    });
  }
});

/**
 * 🏥 Check cache health
 */
router.get('/cache/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await cacheService.isHealthy();
    
    res.json({
      success: true,
      data: {
        healthy: isHealthy,
        status: isHealthy ? 'connected' : 'disconnected'
      },
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check cache health',
      timestamp: Date.now()
    });
  }
});

/**
 * 🗑️ Clear all cache entries (admin only)
 */
router.delete('/cache/clear', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware for admin-only access
    await cacheService.clearAll();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: Date.now()
    });
  }
});

/**
 * 🗑️ Invalidate specific cache entry
 */
router.post('/cache/invalidate', async (req: Request, res: Response) => {
  try {
    const { image, schema, categoryName } = req.body;
    
    if (!image || !schema) {
      res.status(400).json({
        success: false,
        error: 'Image and schema are required',
        timestamp: Date.now()
      });
      return;
    }
    
    await cacheService.invalidate(image, schema, categoryName);
    
    res.json({
      success: true,
      message: 'Cache entry invalidated',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache',
      timestamp: Date.now()
    });
  }
});

export default router;
