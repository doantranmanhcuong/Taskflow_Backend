import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    console.log('[AUTH] Register request:', dto);
    return this.appService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    console.log('[AUTH] Login request:', dto);
    return this.appService.login(dto);
  }
}
