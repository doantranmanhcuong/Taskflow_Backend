import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { HttpModule } from '@nestjs/axios';
import { JwtMiddleware } from '../common/jwt.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.app'],
      isGlobal: true,
    }),
    HttpModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes('*'); 
  }
}
