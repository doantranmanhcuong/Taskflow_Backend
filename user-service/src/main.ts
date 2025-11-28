import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConsulService } from '../../registry/src/consul.service';
import axios from 'axios';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ 
      whitelist: true, 
      transform: true,
      forbidNonWhitelisted: true 
    })
  );

  app.use((req, res, next) => {
    if (req.headers.authorization) {
      console.log('[USER REQ] Incoming Authorization header:', req.headers.authorization.substring(0, 50) + '...');
    } else {
      console.log('[USER REQ] No Authorization header in request');
    }
    next();
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`User Service is running at http://localhost:${port}/api`);

  console.log('[USER ENV] JWT_SECRET preview:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'MISSING');
  console.log('[USER ENV] JWT_EXPIRE:', process.env.JWT_EXPIRE || 'default 3600');

  // Start Consul registration after server is listening
  try {
    const consul = app.get(ConsulService, { strict: false });
    if (consul && typeof consul.startRegistration === 'function') {
      consul.startRegistration();
      console.log('Consul registration started for user-service');
    }
  } catch (err) {
    console.warn('Consul registration could not be started:', err && err.message ? err.message : err);
  }

  (async () => {
    try {
      const serviceName = 'user-service';
      const portNum = Number(port);
      const hostname = os.hostname();
      const expectedId = `${serviceName}-${hostname}-${portNum}`;

      await new Promise((r) => setTimeout(r, 2000));

      try {
        const deregResp = await axios.put(`http://127.0.0.1:8500/v1/agent/service/deregister/${expectedId}`);
        if (deregResp.status === 200) {
          console.log(`Deregistered old service ${expectedId}`);
        }
      } catch (deregErr) {
        if (axios.isAxiosError(deregErr) && deregErr.response?.status !== 404) {
          console.warn('Deregister warning:', deregErr.message);
        }
      }

      const servicesResp = await axios.get('http://127.0.0.1:8500/v1/agent/services');
      if (servicesResp.status !== 200) {
        throw new Error(`Consul services fetch failed: ${servicesResp.status}`);
      }
      const services = servicesResp.data || {};
      const found = Object.values(services).some((s: any) => s.ID === expectedId);

      if (!found) {
        console.warn(new Date().toISOString(), `Consul fallback: service ${expectedId} not found in agent, attempting manual HTTP registration`);
        const registerBody = {
          ID: expectedId,
          Name: serviceName,
          Address: '127.0.0.1',
          Port: portNum,
          Check: {
            HTTP: `http://127.0.0.1:${portNum}/api/health`,
            Interval: '10s',
            Timeout: '5s',
          },
        };
        const registerResp = await axios.put('http://127.0.0.1:8500/v1/agent/service/register', registerBody, { 
          headers: { 'Content-Type': 'application/json' } 
        });
        if (registerResp.status === 200) {
          console.log(new Date().toISOString(), `Consul fallback: manual registration completed for ${expectedId}`);
        } else {
          throw new Error(`Registration failed: ${registerResp.status}`);
        }
      } else {
        console.log(new Date().toISOString(), `Consul agent already has registration for ${expectedId}`);
      }
    } catch (err) {
      console.warn(new Date().toISOString(), 'Consul fallback registration failed:', err && err.message ? err.message : err);
    }
  })();
}

bootstrap();