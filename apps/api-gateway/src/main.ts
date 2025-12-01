import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  
  const startupServiceUrl = process.env.STARTUP_SERVICE_URL || 'http://localhost:3008';
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  
  // Proxy middleware for file uploads to startup service
  // This must be registered BEFORE the NestJS routes
  // Note: Using regex-like matching since app.use() doesn't support :id params
  app.use('/api/startups', (req: Request, res: Response, next: NextFunction) => {
    // Only proxy POST requests to documents endpoint (file uploads)
    // Match pattern: /api/startups/{uuid}/documents
    const documentsMatch = req.url.match(/^\/[a-f0-9-]+\/documents$/i);
    if (req.method !== 'POST' || !documentsMatch) {
      return next();
    }
    
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      const token = authHeader.substring(7);
      jwt.verify(token, jwtSecret);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Create proxy for this request
    // When mounted at /api/startups, req.url is /{uuid}/documents
    // We need to forward to /startups/{uuid}/documents
    const proxy = createProxyMiddleware({
      target: startupServiceUrl,
      changeOrigin: true,
      pathRewrite: (path) => `/startups${path}`,
      on: {
        proxyReq: (proxyReq, req) => {
          console.log(`[Proxy] Forwarding file upload to ${startupServiceUrl}/startups${req.url}`);
        },
        error: (err, req, res) => {
          console.error('[Proxy] Error:', err.message);
        },
      },
    });
    
    return proxy(req, res, next);
  });
  
  app.enableCors();
  await app.listen(3005);
  console.log('API Gateway started on port 3005');
}
bootstrap();
