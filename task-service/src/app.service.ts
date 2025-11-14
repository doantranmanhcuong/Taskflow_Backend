import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task } from '../entities/task.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async createTask(userId: number, dto: CreateTaskDto) {
    console.log('[TASK-SERVICE] createTask → userId:', userId, 'dto:', dto);

    const task = this.taskRepo.create({
      ...dto,
      userId,
    });

    const saved = await this.taskRepo.save(task);
    console.log('[TASK-SERVICE] created:', saved);
    return saved;
  }

  async getTasks(userId: number) {
    console.log('[TASK-SERVICE] getTasks → userId:', userId);

    const tasks = await this.taskRepo.find({ where: { userId } });
    console.log('[TASK-SERVICE] found tasks:', tasks.length);
    return tasks;
  }

  async updateTask(userId: number, id: number, dto: UpdateTaskDto) {
    console.log(
      '[TASK-SERVICE] updateTask → userId:',
      userId,
      'taskId:',
      id,
      'dto:',
      dto,
    );

    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) {
      console.log(
        '[TASK-SERVICE] updateTask → NOT FOUND for userId:',
        userId,
        'taskId:',
        id,
      );
      throw new NotFoundException('Task not found');
    }

    await this.taskRepo.update(id, dto);

    const updated = await this.taskRepo.findOne({ where: { id } });
    console.log('[TASK-SERVICE] updateTask → updated:', updated);
    return updated;
  }

  async deleteTask(userId: number, id: number) {
    console.log(
      '[TASK-SERVICE] deleteTask → userId:',
      userId,
      'taskId:',
      id,
    );

    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) {
      console.log(
        '[TASK-SERVICE] deleteTask → NOT FOUND for userId:',
        userId,
        'taskId:',
        id,
      );
      throw new NotFoundException('Task not found');
    }

    await this.taskRepo.delete(id);

    console.log('[TASK-SERVICE] deleteTask → deleted OK');
    return { message: 'Task deleted' };
  }
}
