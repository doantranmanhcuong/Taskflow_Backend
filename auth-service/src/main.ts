import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConsulService } from '../../registry/src/consul.service';
import axios from 'axios';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    rawBody: false,
    bodyParser: true,
  });
  app.use((req, res, next) => {
    console.log('[AUTH] Received RAW HTTP request:', req.method, req.url);
    next();
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Auth Service is running at http://localhost:${port}/api`);

  try {
    const consul = app.get(ConsulService, { strict: false });
    if (consul && typeof consul.startRegistration === 'function') {
      consul.startRegistration();
      console.log('Consul registration started for auth-service');
    }
  } catch (err) {
    console.warn('Consul registration could not be started:', err && err.message ? err.message : err);
  }

  (async () => {
    try {
      const serviceName = 'auth-service';
      const portNum = Number(port);
      const hostname = os.hostname();
      const expectedId = `${serviceName}-${hostname}-${portNum}`;

      await new Promise((r) => setTimeout(r, 2000));  

      try {
        await axios.put(`http://127.0.0.1:8500/v1/agent/service/deregister/${expectedId}`);
        console.log(`Deregistered old service ${expectedId} if existed`);
      } catch (deregErr) {
      }

      const servicesResp = await axios.get('http://127.0.0.1:8500/v1/agent/services');
      const services = servicesResp && servicesResp.data ? servicesResp.data : {};

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
            Interval: '50s',
            Timeout: '10s',  
          },
        };
        await axios.put('http://127.0.0.1:8500/v1/agent/service/register', registerBody, { headers: { 'Content-Type': 'application/json' } });
        console.log(new Date().toISOString(), `Consul fallback: manual registration completed for ${expectedId}`);
      } else {
        console.log(new Date().toISOString(), `Consul agent already has registration for ${expectedId}`);
      }
    } catch (err) {
      console.warn(new Date().toISOString(), 'Consul fallback registration failed:', err && err.message ? err.message : err);
    }
  })();
}

bootstrap();