import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Consul from 'consul';
import * as os from 'os';
import { networkInterfaces } from 'os';

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

@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  private consul: Consul;
  private serviceId: string;
  private config: ConsulConfig;
  private registered = false;
  private retryIntervalMs = 5000;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(config: ConsulConfig) {
    this.config = {
      host: config.host || '127.0.0.1',
      port: config.port || 8500,
      // Try to resolve a usable service address (non-loopback) as default
      serviceAddress: config.serviceAddress || this.resolveDefaultAddress() || '127.0.0.1',
      healthCheckPath: config.healthCheckPath || '/health',
      healthCheckInterval: config.healthCheckInterval || '10s',
      healthCheckTimeout: config.healthCheckTimeout || '5s',
      ...config,
    };
    const forceLocal = process.env.CONSUL_FORCE_LOCAL === 'true' || this.config.host === '127.0.0.1' || this.config.host === 'localhost';
    if (forceLocal) {
      this.config.serviceAddress = '127.0.0.1';
      console.log(new Date().toISOString(), `ConsulService: forcing serviceAddress to 127.0.0.1 for dev/local (${this.config.serviceName})`);
    }

    this.consul = new Consul({
      host: this.config.host,
      port: this.config.port,
    });

    this.serviceId = `${this.config.serviceName}-${this.getHostName()}-${this.config.servicePort}`;
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
  }

  async onModuleDestroy() {
    this.stopRegistrationLoop();
    await this.deregister();
  }

  private getHostName(): string {
    return os.hostname();
  }

  private resolveDefaultAddress(): string | undefined {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]!) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return undefined;
  }

  private async register(): Promise<void> {
    const serviceDef = {
      id: this.serviceId,
      name: this.config.serviceName,
      address: this.config.serviceAddress!,
      port: this.config.servicePort,
      check: {
        name: `${this.config.serviceName}-health-check`,
        http: `http://${this.config.serviceAddress}:${this.config.servicePort}${this.config.healthCheckPath}`,
        interval: this.config.healthCheckInterval!,
        timeout: this.config.healthCheckTimeout!,
      },
    };

    console.log(new Date().toISOString(), `Consul register: config=`, {
      host: this.config.host,
      port: this.config.port,
      serviceName: this.config.serviceName,
      servicePort: this.config.servicePort,
      serviceAddress: this.config.serviceAddress,
      healthCheckPath: this.config.healthCheckPath,
    });
    console.log(new Date().toISOString(), `Consul register: serviceDef=`, serviceDef);

    await new Promise<void>((resolve, reject) => {
      try {
        (this.consul.agent.service.register as any)(serviceDef, (err: any) => {
          if (err) {
            console.error(`Consul register callback error for ${this.config.serviceName}:`, err && err.message ? err.message : err);
            return reject(err);
          }
          resolve();
        });
      } catch (err: any) {
        console.error(`Consul register thrown error for ${this.config.serviceName}:`, err && err.message ? err.message : err);
        return reject(err);
      }
    });
    this.registered = true;
    console.log(new Date().toISOString(), `Registered service ${this.config.serviceName} on port ${this.config.servicePort} (id=${this.serviceId}, address=${this.config.serviceAddress})`);

    // After register, query the local agent for its services to confirm
    try {
      (this.consul.agent.services as any)((err: any, services: any) => {
        if (err) {
          console.warn(new Date().toISOString(), `Failed to list agent services after registering ${this.serviceId}:`, err && err.message ? err.message : err);
          return;
        }
        const found = Object.values(services).some((s: any) => s.ID === this.serviceId || s.Service === this.config.serviceName || s.Name === this.config.serviceName);
        console.log(new Date().toISOString(), `Agent services listed; registration presence for ${this.serviceId}:`, !!found);
      });
    } catch (err: any) {
      console.warn(new Date().toISOString(), `Error while querying agent services:`, err && err.message ? err.message : err);
    }
  }

  private async deregister(): Promise<void> {
    if (!this.registered) return;
    try {
      await new Promise<void>((resolve, reject) => {
        try {
          (this.consul.agent.service.deregister as any)(this.serviceId, (err: any) => {
            if (err) {
              console.error(`Consul deregister callback error for ${this.serviceId}:`, err && err.message ? err.message : err);
              return reject(err);
            }
            resolve();
          });
        } catch (err: any) {
          console.error(`Consul deregister thrown error for ${this.serviceId}:`, err && err.message ? err.message : err);
          return reject(err);
        }
      });
      this.registered = false;
      console.log(new Date().toISOString(), `Deregistered service ${this.config.serviceName} (id=${this.serviceId})`);
    } catch (err) {
      console.error(new Date().toISOString(), `Failed to deregister service ${this.config.serviceName} (id=${this.serviceId}):`, err && (err as any).message ? (err as any).message : err);
    }
  }

  private async isConsulReachable(): Promise<boolean> {
    try {
      await new Promise<void>((resolve, reject) => {
        try {
          (this.consul.agent.self as any)((err: any, result: any) => {
            if (err) {
              console.warn(new Date().toISOString(), `Consul agent.self returned error:`, err && err.message ? err.message : err);
              return reject(err);
            }
            resolve();
          });
        } catch (err: any) {
          console.warn(new Date().toISOString(), `Consul agent.self thrown error:`, err && err.message ? err.message : err);
          return reject(err);
        }
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  private startRegistrationLoop() {
    const attempt = async () => {
      try {
        console.log(new Date().toISOString(), `Attempting Consul registration for ${this.config.serviceName} (id=${this.serviceId})`);
        const reachable = await this.isConsulReachable();
        if (!reachable) throw new Error('Consul not reachable');

        if (!this.registered) {
          await this.register();
        }
        // if registered, we can clear any retry timers
        this.stopRegistrationLoop();
      } catch (err: any) {
        console.warn(new Date().toISOString(), `Consul registration attempt failed for ${this.config.serviceName}: ${err && err.message ? err.message : err}. Retrying in ${this.retryIntervalMs}ms`);
        // schedule next attempt
        this.retryTimer = setTimeout(attempt, this.retryIntervalMs) as unknown as NodeJS.Timeout;
      }
    };

    attempt();
  }

  startRegistration() {
    this.startRegistrationLoop();
  }

  private stopRegistrationLoop() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer as any);
      this.retryTimer = null;
    }
  }

  /**
   * Resolve service URL from Consul
   * @param serviceName - Name of the service to resolve
   * @returns Service URL (http://address:port)
   */
  async resolveService(serviceName: string): Promise<string> {
    const result = await this.consul.catalog.service.nodes(serviceName);
    if (result.length === 0) {
      throw new Error(`Service ${serviceName} not found in Consul`);
    }
    return `http://${result[0].Address}:${result[0].ServicePort}`;
  }

  /**
   * Get all instances of a service
   * @param serviceName - Name of the service
   * @returns Array of service instances
   */
  async getServiceInstances(serviceName: string): Promise<any[]> {
    const result = await this.consul.catalog.service.nodes(serviceName);
    return result;
  }

  /**
   * Get Consul client for advanced operations
   */
  getConsulClient(): Consul {
    return this.consul;
  }
}
