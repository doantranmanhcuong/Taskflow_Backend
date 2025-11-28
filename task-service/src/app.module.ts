import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsulModule } from '../../registry/src/consul.module';
import { JwtModule } from '@nestjs/jwt';  

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Task } from '../entities/task.entity';
import { HealthController } from './health.controller';
import { JwtStrategy } from '../guard/jwt.strategy';  

@Module({
  imports: [
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

    TypeOrmModule.forFeature([Task]),

    // Consul registration for service discovery
    ConsulModule.register({
      serviceName: 'task-service',
      servicePort: Number(process.env.PORT) || 3003,
      host: process.env.CONSUL_HOST || '127.0.0.1',
      port: Number(process.env.CONSUL_PORT) || 8500,
      healthCheckPath: '/api/health',  
    }),

    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRE') || '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AppController,
    HealthController
  ],
  providers: [AppService, JwtStrategy],  
})
export class AppModule {}