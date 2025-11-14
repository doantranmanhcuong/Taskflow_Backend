import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FilterTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['pending', 'doing', 'completed'])
  status?: 'pending' | 'doing' | 'completed';

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';
}
