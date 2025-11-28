import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';  

@Controller('users')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('sync')  
  syncUser(@Body() dto: any) {
    console.log('[USER] Sync user:', dto);
    return this.appService.syncUser(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req) {
    console.log('[USER] req.user in profile:', JSON.stringify(req.user || {}));
    const userId = req.user?.userId;
    if (!userId) {
      console.log('[USER] No userId from token');
      throw new UnauthorizedException('Invalid token - no user ID');
    }
    console.log('[USER] userId from JWT:', userId);
    return this.appService.getUserById(userId);
  }

  @Put('update')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Invalid token - no user ID');
    }
    console.log('[USER] Update profile for userId:', userId);
    return this.appService.updateProfile(userId, dto);
  }
}