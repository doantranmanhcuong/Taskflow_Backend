"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsulService = void 0;
const common_1 = require("@nestjs/common");
const consul_1 = __importDefault(require("consul"));
const os = __importStar(require("os"));
let ConsulService = class ConsulService {
    constructor(config) {
        this.config = {
            host: config.host || '127.0.0.1',
            port: config.port || 8500,
            serviceAddress: config.serviceAddress || 'localhost',
            healthCheckPath: config.healthCheckPath || '/health',
            healthCheckInterval: config.healthCheckInterval || '10s',
            healthCheckTimeout: config.healthCheckTimeout || '5s',
            ...config,
        };
        this.consul = new consul_1.default({
            host: this.config.host,
            port: this.config.port,
        });
        this.serviceId = `${this.config.serviceName}-${this.getHostName()}-${this.config.servicePort}`;
    }
    async onModuleInit() {
        await this.register();
    }
    async onModuleDestroy() {
        await this.deregister();
    }
    getHostName() {
        return os.hostname();
    }
    async register() {
        const serviceDef = {
            id: this.serviceId,
            name: this.config.serviceName,
            address: this.config.serviceAddress,
            port: this.config.servicePort,
            check: {
                name: `${this.config.serviceName}-health-check`,
                http: `http://${this.config.serviceAddress}:${this.config.servicePort}${this.config.healthCheckPath}`,
                interval: this.config.healthCheckInterval,
                timeout: this.config.healthCheckTimeout,
            },
        };
        await this.consul.agent.service.register(serviceDef);
        console.log(`Registered service ${this.config.serviceName} on port ${this.config.servicePort}`);
    }
    async deregister() {
        await this.consul.agent.service.deregister(this.serviceId);
        console.log(`Deregistered service ${this.config.serviceName}`);
    }
    async resolveService(serviceName) {
        const result = await this.consul.catalog.service.nodes(serviceName);
        if (result.length === 0) {
            throw new Error(`Service ${serviceName} not found in Consul`);
        }
        return `http://${result[0].Address}:${result[0].ServicePort}`;
    }
    async getServiceInstances(serviceName) {
        const result = await this.consul.catalog.service.nodes(serviceName);
        return result;
    }
    getConsulClient() {
        return this.consul;
    }
};
exports.ConsulService = ConsulService;
exports.ConsulService = ConsulService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], ConsulService);
//# sourceMappingURL=consul.service.js.map