import { DynamicModule } from '@nestjs/common';
import { ConsulConfig } from './consul.service';
export declare class ConsulModule {
    static register(config: ConsulConfig): DynamicModule;
    static registerAsync(options: {
        useFactory: (...args: any[]) => Promise<ConsulConfig> | ConsulConfig;
        inject?: any[];
    }): DynamicModule;
}
