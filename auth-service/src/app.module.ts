import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsulModule } from '../../registry/src/consul.module';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from '../entities/user.entity';
import { JwtStrategy } from '../guard/jwt.strategy';
import { HealthController } from './health.controller';  

@Module({
  imports: [
    // Load tất cả env
    ConfigModule.forRoot({
      envFilePath: ['.env.app', '.env.database'],
      isGlobal: true,
    }),

    // MySQL
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true, 
    }),

    TypeOrmModule.forFeature([User]),

    HttpModule,
    // Consul registration for service discovery
    ConsulModule.register({
      serviceName: 'auth-service',
      servicePort: Number(process.env.PORT) || 3001,
      host: process.env.CONSUL_HOST || '127.0.0.1',
      port: Number(process.env.CONSUL_PORT) || 8500,
      healthCheckPath: '/api/health', 
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: Number(process.env.JWT_EXPIRE) || 3600,  
      },
    }),
  ],
  controllers: [
    AppController,
    HealthController
  ],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}