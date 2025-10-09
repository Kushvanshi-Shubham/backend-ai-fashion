import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import extractionRoutes from './routes/extraction';
import { errorHandler, notFound } from './middleware/errorHandler';
import { checkApiConfiguration } from './services/baseApi';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

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
app.use('/api', extractionRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'AI Fashion Extractor Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
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