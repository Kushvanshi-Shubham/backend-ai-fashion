/**
 * 🔍 Sentry Configuration for Backend
 * Error tracking and performance monitoring for Node.js/Express
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Express, Request, Response, NextFunction } from 'express';

export const initSentry = (app: Express) => {
  // Only initialize if DSN is provided
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.info('⚠️  Sentry monitoring is disabled (no DSN configured)');
    return;
  }

  Sentry.init({
    dsn,
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Release version
    release: process.env.APP_VERSION || 'unknown',
    
    // Integrations
    integrations: [
      // HTTP integration for Express
      Sentry.httpIntegration(),
      
      // Profiling
      nodeProfilingIntegration(),
      
      // PostgreSQL integration (if using pg)
      Sentry.postgresIntegration(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
        console.error('Sentry (dev mode):', event.exception, hint);
        return null;
      }
      
      // Filter sensitive data
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        
        // Remove sensitive query params
        if (event.request.query_string && typeof event.request.query_string === 'string') {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]*/gi, 'password=[REDACTED]')
            .replace(/token=[^&]*/gi, 'token=[REDACTED]');
        }
      }
      
      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
    ],
  });

  console.info('✅ Sentry monitoring initialized', {
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
  });
  
  // Note: Error handling middleware should be added after routes via sentryErrorHandler()
};

/**
 * Error handler middleware (must be after routes)
 */
export const sentryErrorHandler = () => {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Capture the error to Sentry
    Sentry.captureException(err, {
      contexts: {
        request: {
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          headers: req.headers,
        },
      },
    });
    
    // Pass error to next handler
    next(err);
  };
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (userId: string | number, email?: string, username?: string) => {
  Sentry.setUser({
    id: String(userId),
    email,
    username,
  });
};

/**
 * Clear user context
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add custom context
 */
export const setSentryContext = (key: string, value: Record<string, unknown>) => {
  Sentry.setContext(key, value);
};

/**
 * Add breadcrumb
 */
export const addSentryBreadcrumb = (message: string, category: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Manually capture exception
 */
export const captureSentryException = (error: Error, context?: Record<string, unknown>) => {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value as Record<string, unknown>);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Capture message
 */
export const captureSentryMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Express middleware to add request context
 */
export const sentryContextMiddleware = () => {
  return (req: Request, _res: Response, next: NextFunction) => {
    Sentry.setContext('request', {
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  };
};

export default {
  initSentry,
  sentryErrorHandler,
  sentryContextMiddleware,
  setSentryUser,
  clearSentryUser,
  setSentryContext,
  addSentryBreadcrumb,
  captureSentryException,
  captureSentryMessage,
};
