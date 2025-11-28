import { Module, Global } from '@nestjs/common';
import { ConsulClientService } from './consul-client.service';

@Global()
@Module({
  providers: [ConsulClientService],
  exports: [ConsulClientService],
})
export class ConsulClientModule {}

