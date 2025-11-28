import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConsulClientModule } from './consul/consul-client.module';
import { ProxyModule } from './proxy/proxy.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ConsulClientModule,
    ProxyModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }

