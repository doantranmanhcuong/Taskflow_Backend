import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConsulService, ConsulConfig } from './consul.service';

@Global()
@Module({})
export class ConsulModule {
  /**
   * Register Consul module with configuration
   * @param config - Consul configuration
   */
  static register(config: ConsulConfig): DynamicModule {
    return {
      module: ConsulModule,
      providers: [
        {
          provide: ConsulService,
          useFactory: () => new ConsulService(config),
        },
      ],
      exports: [ConsulService],
    };
  }

  /**
   * Register Consul module asynchronously
   * @param options - Async configuration options
   */
  static registerAsync(options: {
    useFactory: (...args: any[]) => Promise<ConsulConfig> | ConsulConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: ConsulModule,
      providers: [
        {
          provide: 'CONSUL_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: ConsulService,
          useFactory: (config: ConsulConfig) => new ConsulService(config),
          inject: ['CONSUL_CONFIG'],
        },
      ],
      exports: [ConsulService],
    };
  }
}
