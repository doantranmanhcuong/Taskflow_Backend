import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task } from '../entities/task.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskStatus } from '../entities/enums/task-status.enum'; // IMPORT ENUM

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
    // KHÔNG thêm completedAt ở đây
    date: dto.date ? new Date(dto.date) : new Date(),
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

  // Xử lý logic completedAt dựa trên status
  if (dto.status !== undefined) {
    if (dto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
      // Nếu chuyển sang COMPLETED, thêm completedAt
      task.completedAt = new Date(); // TRỰC TIẾP GÁN VÀO TASK, KHÔNG QUA DTO
    } else if (dto.status !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED) {
      // Nếu chuyển từ COMPLETED sang trạng thái khác, xóa completedAt
      task.completedAt = null; // TRỰC TIẾP GÁN VÀO TASK
    }
    task.status = dto.status;
  }

  // Cập nhật các field khác nếu có
  if (dto.title !== undefined) {
    task.title = dto.title;
  }
  if (dto.description !== undefined) {
    task.description = dto.description;
  }
  if (dto.date !== undefined) {
    // Chuyển string date thành Date object
    task.date = new Date(dto.date);
  }

  // ❌ XÓA DÒNG NÀY VÌ completedAt KHÔNG CÓ TRONG DTO
  // if (dto.completedAt !== undefined) {
  //   task.completedAt = dto.completedAt;
  // }

  const updated = await this.taskRepo.save(task);
  
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

  // ✅ METHOD ĐÁNH DẤU HOÀN THÀNH
  async markAsCompleted(userId: number, id: number) {
    console.log(
      '[TASK-SERVICE] markAsCompleted → userId:',
      userId,
      'taskId:',
      id,
    );

    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) {
      console.log(
        '[TASK-SERVICE] markAsCompleted → NOT FOUND for userId:',
        userId,
        'taskId:',
        id,
      );
      throw new NotFoundException('Task not found');
    }

    // Cập nhật status và completedAt - DÙNG ENUM
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();

    const updated = await this.taskRepo.save(task);
    console.log('[TASK-SERVICE] markAsCompleted → updated:', updated);
    return updated;
  }

  // ✅ METHOD BỎ ĐÁNH DẤU HOÀN THÀNH
  async markAsIncomplete(userId: number, id: number) {
    console.log(
      '[TASK-SERVICE] markAsIncomplete → userId:',
      userId,
      'taskId:',
      id,
    );

    const task = await this.taskRepo.findOne({ where: { id, userId } });

    if (!task) {
      console.log(
        '[TASK-SERVICE] markAsIncomplete → NOT FOUND for userId:',
        userId,
        'taskId:',
        id,
      );
      throw new NotFoundException('Task not found');
    }

    // Cập nhật status và xóa completedAt - DÙNG ENUM
    task.status = TaskStatus.PENDING;
    task.completedAt = null;

    const updated = await this.taskRepo.save(task);
    console.log('[TASK-SERVICE] markAsIncomplete → updated:', updated);
    return updated;
  }
}