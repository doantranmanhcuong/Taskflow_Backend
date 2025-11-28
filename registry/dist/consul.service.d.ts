import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Consul from 'consul';
export interface ConsulConfig {
    host?: string;
    port?: number;
    serviceName: string;
    servicePort: number;
    serviceAddress?: string;
    healthCheckPath?: string;
    healthCheckInterval?: string;
    healthCheckTimeout?: string;
}
export declare class ConsulService implements OnModuleInit, OnModuleDestroy {
    private consul;
    private serviceId;
    private config;
    constructor(config: ConsulConfig);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private getHostName;
    private register;
    private deregister;
    resolveService(serviceName: string): Promise<string>;
    getServiceInstances(serviceName: string): Promise<any[]>;
    getConsulClient(): Consul;
}
