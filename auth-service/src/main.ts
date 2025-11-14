import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

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
}

bootstrap();
