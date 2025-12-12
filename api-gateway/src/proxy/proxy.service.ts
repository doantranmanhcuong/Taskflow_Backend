import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { ConfigService } from '@nestjs/config';
import { ConsulClientService } from '../consul/consul-client.service';
import { firstValueFrom } from 'rxjs';

type QueryParams = Record<string, string | string[]>;

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private serviceCache: Map<string, { url: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private consulClient: ConsulClientService,
  ) {
    this.logger.log('ProxyService initialized - Using Consul for service discovery');
  }

  private async getServiceUrl(serviceName: string): Promise<string> {
    console.log(`[Proxy] Resolving service: ${serviceName}`);

    const cached = this.serviceCache.get(serviceName);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      console.log(`[Proxy] Using cache for ${serviceName}: ${cached.url}`);
      return cached.url;
    }

    try {
      const url = await this.consulClient.resolveService(serviceName);
      this.serviceCache.set(serviceName, { url, timestamp: now });
      this.logger.log(`Resolved ${serviceName} from Consul: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to resolve ${serviceName} from Consul: ${error.message}`);
      this.serviceCache.delete(serviceName);

      throw new HttpException(
        `Service ${serviceName} is not available in service registry. Please ensure the service is registered in Consul.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async forwardRequest(
    serviceName: string,
    originalPath: string,
    method: string,
    headers?: any,
    body?: any,
    queryParams?: QueryParams,
  ): Promise<any> {
    try {
      const serviceUrl = await this.getServiceUrl(serviceName);
      let cleanPath = originalPath;
      if (originalPath.startsWith('/api/')) {
        cleanPath = originalPath.replace('/api/', '/');
        console.log(`[Proxy] Stripped '/api' from path: ${originalPath} → ${cleanPath}`);
      } else if (originalPath.startsWith('/api')) {
        cleanPath = '/';
      }
      const adjustedPath = cleanPath;
      const url = `${serviceUrl}/api${adjustedPath}`;

      this.logger.log(`Forwarding ${method} ${originalPath} to: ${url} (query: ${JSON.stringify(queryParams || {})})`);

      // THAY TOÀN BỘ ĐOẠN cleanHeaders BẰNG ĐOẠN NÀY:
const cleanHeaders = { ...headers };

// Chỉ xóa những header thật sự không cần
delete cleanHeaders['host'];
delete cleanHeaders['content-length'];
delete cleanHeaders['if-modified-since'];
delete cleanHeaders['if-none-match'];
delete cleanHeaders['cache-control'];

// ĐẢM BẢO AUTHORIZATION KHÔNG BAO GIỜ BỊ XÓA
if (headers.authorization || headers.Authorization) {
  cleanHeaders['Authorization'] = headers.authorization || headers.Authorization;
}

      const requestConfig: AxiosRequestConfig = {
        method: method.toLowerCase() as any,
        url,
        headers: {
          ...cleanHeaders,
          'Accept': 'application/json',
        },
        params: queryParams,
        timeout: 30000,
        validateStatus: () => true,
        maxRedirects: 0,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };

      if (body && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
        const bodyStr = JSON.stringify(body);
        const bodyLength = Buffer.byteLength(bodyStr, 'utf8');
        requestConfig.headers = {
          ...requestConfig.headers,
          'Content-Type': 'application/json',
          'Content-Length': bodyLength.toString(),
        };
        requestConfig.data = bodyStr;
        console.log(`[Proxy] Body length: ${bodyLength} bytes sent (body: ${bodyStr.substring(0, 50)}...)`);
      }

      const response = await firstValueFrom(this.httpService.request(requestConfig));

      this.logger.log(`Received from ${serviceName}: status ${response.status}, data preview: ${JSON.stringify(response.data).substring(0, 100)}...`);

      if (response.status >= 400) {
        throw new HttpException(response.data || `Service error ${response.status}`, response.status);
      }

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      this.logger.error(`Forward error for ${serviceName}: ${axiosError.message} (URL: ${axiosError.config?.url})`);
      this.serviceCache.delete(serviceName);

      if (axiosError.response) {
        throw new HttpException(axiosError.response.data || axiosError.message, axiosError.response.status);
      }
      if (axiosError.code === 'ECONNABORTED') {
        throw new HttpException(`Timeout to ${serviceName}`, HttpStatus.GATEWAY_TIMEOUT);
      }
      throw new HttpException(`Service ${serviceName} unavailable`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}