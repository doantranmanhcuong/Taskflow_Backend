// src/dto/profile-response.dto.ts
import { Exclude, Expose, Transform } from 'class-transformer';

export class ProfileResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  phone?: string;

  @Expose()
  avatar?: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString() || value)
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value?.toISOString() || value)
  updatedAt: Date;

  @Exclude()
  password?: string;

  constructor(partial: Partial<ProfileResponseDto>) {
    Object.assign(this, partial);
  }
}