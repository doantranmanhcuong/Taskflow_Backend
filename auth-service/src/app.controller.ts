import { Body, Controller, Post, Put, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

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

  // ========== THÊM 2 ENDPOINTS MỚI ==========

  @Post('verify-password')
  @UseGuards(JwtAuthGuard)
  async verifyPassword(
    @Req() req,
    @Body() body: { password: string }
  ) {
    console.log('[AUTH] verify-password called for user:', req.user);
    
    const userId = req.user?.sub || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Invalid token - no user ID');
    }
    
    const isValid = await this.appService.verifyPassword(userId, body.password);
    
    return { 
      userId,
      isValid 
    };
  }

 @Put('change-password')
@UseGuards(JwtAuthGuard)
async changePassword(
  @Req() req: any,
  @Body() body: { currentPassword?: string; newPassword: string }
) {
  const userId = req.user.sub || req.user.userId;
  if (!userId) throw new UnauthorizedException('Invalid token');

  await this.appService.changePassword(userId, body.newPassword, body.currentPassword);
  
  return { message: 'Password changed successfully' };
}
}