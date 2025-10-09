// 🚀 Queue Controller - Backend API endpoints for queue management

import { Request, Response, NextFunction } from 'express';
import { QueueManagementService } from '../services/queueManagementService';

export class QueueController {
  private queueService: QueueManagementService;

  constructor() {
    this.queueService = new QueueManagementService();
  }

  // 🎯 Submit extraction job to queue
  submitExtractionJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { 
        image, 
        schema, 
        categoryName, 
        department, 
        subDepartment, 
        priority = 'normal',
        userId 
      } = req.body;

      if (!image || !schema) {
        res.status(400).json({
          success: false,
          error: 'Image and schema are required',
          timestamp: Date.now()
        });
        return;
      }

      // Add job to queue
      const jobId = await this.queueService.addJob({
        imageData: image,
        schema,
        categoryName,
        department,
        subDepartment,
        priority,
        userId
      });

      console.log(`📋 Job submitted to queue: ${jobId}`);

      res.json({
        success: true,
        data: {
          jobId,
          message: 'Job submitted to processing queue',
          estimatedWaitTime: 'Calculating...'
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error submitting job to queue:', error);
      next(error);
    }
  };

  // 🎯 Get job status (for frontend polling)
  getJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required',
          timestamp: Date.now()
        });
        return;
      }

      const status = await this.queueService.getJobStatus(jobId);

      if (!status) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
          timestamp: Date.now()
        });
        return;
      }

      res.json({
        success: true,
        data: status,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error getting job status:', error);
      next(error);
    }
  };

  // 🎯 Get queue overview (for monitoring/admin)
  getQueueOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const overview = await this.queueService.getQueueOverview();

      res.json({
        success: true,
        data: overview,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error getting queue overview:', error);
      next(error);
    }
  };

  // 🎯 Health check for queue system
  healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const overview = await this.queueService.getQueueOverview();
      
      const isHealthy = 
        overview.systemHealth.canAcceptJobs && 
        overview.tokenBudget.remainingQuota > 1000;

      res.json({
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'degraded',
          canAcceptJobs: overview.systemHealth.canAcceptJobs,
          queueStats: overview.queueStats,
          tokenBudget: {
            remaining: overview.tokenBudget.remainingQuota,
            utilizationPercent: overview.tokenBudget.utilizationPercent
          },
          activeJobs: overview.systemHealth.activeJobs,
          maxConcurrent: overview.systemHealth.maxConcurrent
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error in queue health check:', error);
      res.status(500).json({
        success: false,
        error: 'Queue system unhealthy',
        timestamp: Date.now()
      });
    }
  };
}