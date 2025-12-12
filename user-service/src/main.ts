// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConsulService } from '../../registry/src/consul.service';
import axios from 'axios';
import * as os from 'os';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Tạo app với CORS cụ thể hơn
  const app = await NestFactory.create(AppModule, { 
    cors: {
      origin: ['http://localhost:4200', 'http://localhost:3000'], // Angular + API Gateway
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    }
  });
  
  app.setGlobalPrefix('api');
  
  // Global validation pipe với cấu hình chi tiết
  app.useGlobalPipes(
    new ValidationPipe({ 
      whitelist: true, 
      transform: true,
      forbidNonWhitelisted: true,
      validationError: {
        target: false, // Không hiển thị object target trong error response
        value: false,  // Không hiển thị giá trị trong error response
      },
      transformOptions: {
        enableImplicitConversion: true, // Tự động convert types
      }
    })
  );

  // Middleware để log request
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      logger.debug(`[${req.method}] ${req.url} - Authorization: ${authHeader.substring(0, 30)}...`);
    } else {
      logger.debug(`[${req.method}] ${req.url} - No Authorization header`);
    }
    next();
  });

  const port = process.env.PORT || 3002;
  
  await app.listen(port);
  logger.log(`User Service is running at http://localhost:${port}/api`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Log JWT config (ẩn bớt cho an toàn)
  if (process.env.JWT_SECRET) {
    const secretPreview = process.env.JWT_SECRET.substring(0, Math.min(process.env.JWT_SECRET.length, 5));
    logger.log(`JWT_SECRET preview: ${secretPreview}... (length: ${process.env.JWT_SECRET.length})`);
  } else {
    logger.warn('JWT_SECRET is not set!');
  }
  logger.log(`JWT_EXPIRE: ${process.env.JWT_EXPIRE || '24h'}`);

  // Consul registration
  try {
    const consul = app.get(ConsulService, { strict: false });
    if (consul && typeof consul.startRegistration === 'function') {
      await consul.startRegistration();
      logger.log('Consul registration started for user-service');
    }
  } catch (err) {
    logger.warn(`Consul registration could not be started: ${err?.message || err}`);
  }

  // Fallback Consul registration (nếu cần)
  if (process.env.CONSUL_ENABLED !== 'false') {
    await registerWithConsulFallback(Number(port), logger);
  } else {
    logger.log('Consul registration is disabled (CONSUL_ENABLED=false)');
  }
}

async function registerWithConsulFallback(port: number, logger: Logger) {
  try {
    const serviceName = 'user-service';
    const portNum = Number(port);
    const hostname = os.hostname();
    const expectedId = `${serviceName}-${hostname}-${portNum}`;
    const consulHost = process.env.CONSUL_HOST || '127.0.0.1';
    const consulPort = process.env.CONSUL_PORT || 8500;
    const consulUrl = `http://${consulHost}:${consulPort}`;

    logger.log(`Attempting Consul registration to ${consulUrl}`);

    // Đợi server khởi động xong
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Kiểm tra Consul agent có hoạt động không
    try {
      await axios.get(`${consulUrl}/v1/agent/self`, { timeout: 5000 });
    } catch (error) {
      logger.warn(`Consul agent is not available at ${consulUrl}: ${error?.message}`);
      return;
    }

    // Deregister service cũ nếu tồn tại
    try {
      await axios.put(`${consulUrl}/v1/agent/service/deregister/${expectedId}`, null, { timeout: 5000 });
      logger.log(`Deregistered old service: ${expectedId}`);
    } catch (deregErr) {
      if (axios.isAxiosError(deregErr)) {
        if (deregErr.response?.status === 404) {
          // Không tìm thấy service cũ - đó là điều bình thường
          logger.debug(`No existing service to deregister: ${expectedId}`);
        } else {
          logger.warn(`Failed to deregister service: ${deregErr.message}`);
        }
      }
    }

    // Kiểm tra xem service đã tồn tại chưa
    try {
      const servicesResp = await axios.get(`${consulUrl}/v1/agent/services`, { timeout: 5000 });
      const services = servicesResp.data || {};
      const found = Object.values(services).some((s: any) => s.ID === expectedId);

      if (!found) {
        logger.log(`Registering service with Consul: ${expectedId}`);
        
        const registerBody = {
          ID: expectedId,
          Name: serviceName,
          Tags: ['user', 'api', process.env.NODE_ENV || 'dev'],
          Address: process.env.SERVICE_HOST || '127.0.0.1',
          Port: portNum,
          Check: {
            HTTP: `http://${process.env.SERVICE_HOST || '127.0.0.1'}:${portNum}/api/health`,
            Interval: '15s',
            Timeout: '5s',
            DeregisterCriticalServiceAfter: '1m',
          },
          Meta: {
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
          }
        };

        const registerResp = await axios.put(
          `${consulUrl}/v1/agent/service/register`, 
          registerBody, 
          { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );
        
        if (registerResp.status === 200) {
          logger.log(`Successfully registered with Consul: ${expectedId}`);
        } else {
          logger.warn(`Consul registration returned status: ${registerResp.status}`);
        }
      } else {
        logger.log(`Service already registered with Consul: ${expectedId}`);
      }
    } catch (regErr) {
      logger.error(`Failed to register with Consul: ${regErr?.message || regErr}`);
    }
  } catch (err) {
    logger.error(`Consul fallback registration process failed: ${err?.message || err}`);
  }
}

// Xử lý lỗi unhandled
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();