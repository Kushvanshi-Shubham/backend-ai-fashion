import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import extractionRoutes from './routes/extraction';
import vlmExtractionRoutes from './routes/vlmExtraction';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import { errorHandler, notFound } from './middleware/errorHandler';
import { checkApiConfiguration } from './services/baseApi';
import { cacheService } from './services/cacheService';

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: '⚠️ Too many requests from this IP. Please try again in 15 minutes.',
    timestamp: Date.now()
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/' || req.path === '/api/health'
});

// Stricter rate limit for extraction endpoints (expensive operations)
const extractionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 extractions per 15 minutes
  message: {
    success: false,
    error: '⚠️ Extraction limit reached. You can perform 50 extractions every 15 minutes. Please wait before trying again.',
    timestamp: Date.now()
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply general rate limiting to all API routes
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API routes
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api', extractionRoutes);
app.use('/api', vlmExtractionRoutes); // Enhanced VLM routes
app.use('/api/admin', adminRoutes); // Admin hierarchy management routes

// Root route
app.get('/', async (req, res) => {
  try {
    const cacheStats = await cacheService.getStats();
    
    res.json({
      message: 'AI Fashion Extractor Backend API',
      version: '2.0.0-vlm',
      status: 'running',
      cache: {
        enabled: cacheStats.enabled,
        connected: cacheStats.connected,
        entries: cacheStats.totalKeys || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      message: 'AI Fashion Extractor Backend API',
      version: '2.0.0-vlm',
      status: 'running',
      cache: { enabled: false, connected: false, entries: 0 },
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Check API configuration on startup
const configCheck = checkApiConfiguration();
if (!configCheck.configured) {
  console.warn('⚠️  API Configuration Warning:');
  console.warn(`   ${configCheck.message}`);
  console.warn('   Suggestions:');
  configCheck.suggestions.forEach(suggestion => {
    console.warn(`   - ${suggestion}`);
  });
} else {
  console.log('✅ API configuration looks good!');
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API available at: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  }
});

export default app;