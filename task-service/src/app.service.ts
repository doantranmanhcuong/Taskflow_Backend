import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task } from '../entities/task.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskStatus } from '../entities/enums/task-status.enum';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async createTask(userId: number, dto: CreateTaskDto) {
    console.log('[TASK-SERVICE] createTask → userId:', userId, 'dto:', dto);

    // XÓA completedAt khỏi DTO nếu có
    const { completedAt, ...taskData } = dto as any;
    
    const task = this.taskRepo.create({
      ...taskData,
      userId,
      status: dto.status || TaskStatus.PENDING,
      date: dto.date ? new Date(dto.date) : new Date(),
      // Mặc định nếu DTO không gửi lên sẽ lấy theo Entity default
      color: (dto as any).color || '#3b82f6', 
      isPinned: (dto as any).isPinned || false,
    });

    const saved = await this.taskRepo.save(task);
    console.log('[TASK-SERVICE] created:', saved);
    return saved;
  }

  async getTasks(userId: number) {
    console.log('[TASK-SERVICE] getTasks → userId:', userId);

    const tasks = await this.taskRepo.find({ 
      where: { userId },
      order: { 
        status: 'ASC',
        createdAt: 'DESC' 
      }
    });
    console.log('[TASK-SERVICE] found tasks:', tasks.length);
    return tasks;
  }

  async getTaskById(userId: number, id: number) {
    console.log('[TASK-SERVICE] getTaskById → userId:', userId, 'taskId:', id);

    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) {
      console.log('[TASK-SERVICE] getTaskById → NOT FOUND');
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async updateTask(userId: number, id: number, dto: UpdateTaskDto) {
    console.log('[TASK-SERVICE] updateTask → userId:', userId, 'taskId:', id, 'dto:', dto);

    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Xử lý logic completedAt dựa trên status
    if (dto.status !== undefined) {
      if (dto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
        task.completedAt = new Date(); 
      } else if (dto.status !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED) {
        task.completedAt = null; 
      }
      task.status = dto.status;
    }

    // Cập nhật các field cơ bản
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.date !== undefined) task.date = new Date(dto.date);
    if (dto.time !== undefined) task.time = dto.time;

    // ✅ BỔ SUNG: Cập nhật màu sắc và trạng thái ghim
    if ((dto as any).color !== undefined) {
      task.color = (dto as any).color;
    }
    if ((dto as any).isPinned !== undefined) {
      task.isPinned = (dto as any).isPinned;
    }

    const updated = await this.taskRepo.save(task);
    
    console.log('[TASK-SERVICE] updateTask → updated:', updated);
    return updated;
  }

  async deleteTask(userId: number, id: number) {
    console.log('[TASK-SERVICE] deleteTask → userId:', userId, 'taskId:', id);

    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.taskRepo.delete(id);
    console.log('[TASK-SERVICE] deleteTask → deleted OK');
    return { message: 'Task deleted' };
  }

  async markAsCompleted(userId: number, id: number) {
    console.log('[TASK-SERVICE] markAsCompleted → userId:', userId, 'taskId:', id);
    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) throw new NotFoundException('Task not found');

    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();

    return await this.taskRepo.save(task);
  }

  async markAsIncomplete(userId: number, id: number) {
    console.log('[TASK-SERVICE] markAsIncomplete → userId:', userId, 'taskId:', id);
    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) throw new NotFoundException('Task not found');

    task.status = TaskStatus.PENDING;
    task.completedAt = null;

    return await this.taskRepo.save(task);
  }
}