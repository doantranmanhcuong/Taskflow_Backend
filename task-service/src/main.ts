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

 const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log('Task Service is running at http://localhost:${port}/api/tasks');
  
  // Start Consul registration after server is listening
  try {
    const consul = app.get(ConsulService, { strict: false });
    if (consul && typeof consul.startRegistration === 'function') {
      consul.startRegistration();
      console.log('Consul registration started for task-service');
    }
  } catch (err) {
    console.warn('Consul registration could not be started:', err && err.message ? err.message : err);
  }

  (async () => {
    try {
      const serviceName = 'task-service';
      const portNum = Number(port);
      const hostname = os.hostname();
      const expectedId = `${serviceName}-${hostname}-${portNum}`;

      // Wait cho Consul client attempt register
      await new Promise((r) => setTimeout(r, 2000));

      // Deregister cũ nếu tồn tại (tránh duplicate)
      try {
        const deregResp = await axios.put(`http://127.0.0.1:8500/v1/agent/service/deregister/${expectedId}`);
        if (deregResp.status === 200) {
          console.log(`Deregistered old service ${expectedId}`);
        }
      } catch (deregErr) {
        // Ignore if not found (status 404 OK)
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