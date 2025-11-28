import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  status() {
    console.log('[USER-SERVICE] Health check requested');
    return { 
      status: 'User service OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
}