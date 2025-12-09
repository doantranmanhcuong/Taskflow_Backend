import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';

import { AppService } from './app.service'; 
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';  

@Controller('tasks')  
@UseGuards(JwtAuthGuard) 
export class AppController {
  constructor(private readonly appService: AppService) {}

  private getUserId(req: any): number {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Invalid token - no user ID');
    }
    console.log('[TASK] userId from JWT:', userId);
    return userId;
  }

  @Get()  
  async getTasks(@Req() req) {
    console.log('[TASK-CONTROLLER] GET /api/tasks called'); 
    const userId = this.getUserId(req);
    const tasks = await this.appService.getTasks(userId);
    console.log('[TASK-CONTROLLER] GET /api/tasks returned', tasks.length, 'tasks');  
    return { data: tasks };  
  }

  @Post('create')
  async createTask(@Req() req, @Body() dto: CreateTaskDto) {
    const userId = this.getUserId(req);
    return this.appService.createTask(userId, dto);
  }

  @Put('update/:id')
  async updateTask(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const userId = this.getUserId(req);
    return this.appService.updateTask(userId, Number(id), dto);
  }

  @Delete('delete/:id')
  async deleteTask(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.appService.deleteTask(userId, Number(id));
  }
}