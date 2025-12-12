// create-task.dto.ts
import { IsString, IsOptional, IsDateString, IsNotEmpty, IsEnum, Matches } from 'class-validator';
import { TaskStatus } from '../entities/enums/task-status.enum';

export class CreateTaskDto {
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;

  @IsOptional() // THÊM DÒNG NÀY
  @IsDateString({}, { message: 'Ngày không hợp lệ (phải là YYYY-MM-DD)' })
  date?: string; // ĐỔI THÀNH OPTIONAL

   @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
    message: 'Giờ không hợp lệ (định dạng HH:mm)' 
  })
  time?: string; // Thêm field time

  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Trạng thái không hợp lệ' })
  status?: TaskStatus;

  //completedAt?: Date | null;
}