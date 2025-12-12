import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsulModule } from '../../registry/src/consul.module';
import { HttpModule } from '@nestjs/axios'; // ← THÊM
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from '../entities/user.entity';
import { JwtStrategy } from '../guard/jwt.strategy';
import { JwtAuthGuard } from '../guard/jwt-auth.guard'; 
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.app', '.env.database'],
      isGlobal: true,
    }),

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

    HttpModule, // ← QUAN TRỌNG: Thêm HttpModule để gọi auth-service
    
    ConsulModule.register({
      serviceName: 'user-service',
      servicePort: Number(process.env.PORT) || 3002,
      host: process.env.CONSUL_HOST || '127.0.0.1',
      port: Number(process.env.CONSUL_PORT) || 8500,
      healthCheckPath: '/api/health',
    }),

    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get('JWT_SECRET');
        console.log('[JWT MODULE] Factory secret preview:', secret.substring(0, 10) + '...');
        return {
          secret: secret,
          signOptions: { expiresIn: configService.get('JWT_EXPIRE') || '24h' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, JwtStrategy, JwtAuthGuard],  
})
export class AppModule {}