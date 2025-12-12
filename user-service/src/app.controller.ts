// src/app.controller.ts
import { Body, Controller, Get, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { ProfileResponseDto } from '../dto/profile-response.dto';

@Controller('users')
@UsePipes(new ValidationPipe({ 
  whitelist: true, 
  forbidNonWhitelisted: true,
  transform: true 
}))
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('sync')
  syncUser(@Body() dto: any) {
    console.log('[USER] Sync user:', dto);
    return this.appService.syncUser(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req): Promise<ProfileResponseDto> {
    console.log('[USER] req.user in profile:', JSON.stringify(req.user || {}));
    const userId = req.user?.userId;
    
    if (!userId) {
      console.log('[USER] No userId from token');
      throw new UnauthorizedException('Invalid token - no user ID');
    }
    
    console.log('[USER] userId from JWT:', userId);
    return await this.appService.getUserById(userId);
  }

@Put('profile')
@UseGuards(JwtAuthGuard)
async updateProfile(
  @Req() req: any,
  @Body() dto: UpdateProfileDto
): Promise<ProfileResponseDto> {
  const userId = (req.user as any)?.userId;
  if (!userId) throw new UnauthorizedException('Invalid token');

  // LẤY TOKEN CHẮC CHẮN 100% – DÒNG DUY NHẤT CẦN THÊM!
  const authHeader = req.headers.authorization || req.headers.Authorization;

  return this.appService.updateProfile(userId, dto, authHeader);
}
}