import { Body, Controller, Get, Headers, Post, Put } from '@nestjs/common';
import { AppService } from './app.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Controller('users')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('sync')
  syncUser(@Body() dto: any) {
    console.log('[USER] Sync user:', dto);
    return this.appService.syncUser(dto);
  }

  @Get('profile')
  getProfile(@Headers('x-user-id') userId: string) {
  console.log('[USER] userId header:', userId);
  return this.appService.getUserById(Number(userId));
}

  @Put('update')
  updateProfile(
    @Headers('x-user-id') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.appService.updateProfile(+userId, dto);
  }
}
