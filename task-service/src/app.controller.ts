import { Controller, Get, Post, Put, Delete, Param, Body, Req, Patch, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';  
import { AppService } from './app.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)  
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getTasks(@Req() req: any) {
    const userId = req.user?.userId;  
    if (!userId) throw new UnauthorizedException('Invalid token - missing user ID'); 
    const tasks = await this.appService.getTasks(userId);
    return { data: tasks };
  }

  @Post()
  async createTask(@Req() req: any, @Body() dto: CreateTaskDto) {
    const userId = req.user?.userId;  
    if (!userId) throw new UnauthorizedException('Invalid token - missing user ID');
    const newTask = await this.appService.createTask(userId, dto);
    return { data: newTask };
  }

  @Put(':id')
  async updateTask(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    const userId = req.user?.userId;  
    if (!userId) throw new UnauthorizedException('Invalid token - missing user ID');
    const updated = await this.appService.updateTask(userId, Number(id), dto);
    return { data: updated };
  }

  @Delete(':id')
  async deleteTask(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.userId; 
    if (!userId) throw new UnauthorizedException('Invalid token - missing user ID');
    await this.appService.deleteTask(userId, Number(id));
    return { success: true };
  }

  //  ENDPOINT ĐÁNH DẤU HOÀN THÀNH
  @Patch(':id/complete')
  async markAsCompleted(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.userId;  
    if (!userId) throw new UnauthorizedException('Invalid token - missing user ID');
    const updated = await this.appService.markAsCompleted(userId, Number(id));
    return { data: updated };
  }

  //  ENDPOINT BỎ ĐÁNH DẤU HOÀN THÀNH
  @Patch(':id/incomplete')
  async markAsIncomplete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.userId;  
    if (!userId) throw new UnauthorizedException('Invalid token - missing user ID');
    const updated = await this.appService.markAsIncomplete(userId, Number(id));
    return { data: updated };
  }
}