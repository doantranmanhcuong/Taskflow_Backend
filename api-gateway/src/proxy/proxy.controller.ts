import { All, Controller, Req, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { ProxyService } from './proxy.service';
import { URL } from 'url';

@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly proxyService: ProxyService) { }

  @All('*')
  async forwardRequest(@Req() req: Request) {
    try {
      const serviceName = this.getServiceNameFromPath(req.url);
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const queryParams = Object.fromEntries(urlObj.searchParams.entries());

      this.logger.log(`Routing ${req.method} ${req.url} (query: ${JSON.stringify(queryParams)}) -> ${serviceName}`);

      return await this.proxyService.forwardRequest(
        serviceName,
        req.url,
        req.method,
        req.headers,
        req.body,
        queryParams
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to forward request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getServiceNameFromPath(url: string): string {
    const path = url.split('?')[0];
    let segments = path.split('/').filter(segment => segment.length > 0);

    if (segments.length === 0) {
      throw new HttpException(
        'Invalid request path. Expected format: /[{api}/]{service-prefix}/...',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Skip 'api' nếu là segment đầu
    if (segments[0] === 'api' && segments.length > 1) {
      segments = segments.slice(1);
      console.log(`[Proxy] Skipped 'api' prefix, new segments:`, segments);
    }

    if (segments.length === 0) {
      throw new HttpException('No service prefix found after skipping /api', HttpStatus.BAD_REQUEST);
    }

    const prefix = segments[0];  // e.g., 'users'

    // Mapping cho mismatch plural/singular (dựa trên serviceName registered)
    const serviceMap: Record<string, string> = {
      'auth': 'auth-service',
      'user': 'user-service',
      'users': 'user-service',  
      'task': 'task-service',
      'tasks': 'task-service',  
    };

    let serviceName = serviceMap[prefix] || `${prefix}-service`;

    return serviceName;
  }
}