import { IsString, IsOptional, IsDateString, IsNotEmpty, IsEnum, Matches, IsBoolean } from 'class-validator';
import { TaskStatus } from '../entities/enums/task-status.enum';

export class CreateTaskDto {
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title!: string; 

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;

  @IsOptional() 
  @IsDateString({}, { message: 'Ngày không hợp lệ (phải là YYYY-MM-DD)' })
  date?: string; 

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
    message: 'Giờ không hợp lệ (định dạng HH:mm)' 
  })
  time?: string; 

  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Trạng thái không hợp lệ' })
  status?: TaskStatus;

  @IsOptional()
  @IsString({ message: 'Màu sắc phải là chuỗi' })
  color?: string;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái ghim phải là kiểu boolean (true/false)' })
  isPinned?: boolean;
}