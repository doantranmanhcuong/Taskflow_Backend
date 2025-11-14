import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(private readonly http: HttpService) {}

  private services = {
    auth: process.env.AUTH_SERVICE,
    users: process.env.USER_SERVICE,
    tasks: process.env.TASK_SERVICE,
  };

  async forward(service, method, endpoint, data, headers) {
    const url = `${this.services[service]}${endpoint}`;

    const cleanHeaders: any = {
      'Content-Type': 'application/json',
    };

    if (headers['authorization'])
      cleanHeaders['Authorization'] = headers['authorization'];

    if (headers['x-user-id'])
      cleanHeaders['x-user-id'] = headers['x-user-id'];

    return (
      await firstValueFrom(
        this.http.request({
          method,
          url,
          data,
          headers: cleanHeaders,
        }),
      )
    ).data;
  }
}
