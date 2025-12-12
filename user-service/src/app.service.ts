// src/app.service.ts
import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  InternalServerErrorException, 
  Logger, 
  BadRequestException,
  Inject, 
  Req,
  UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios'; // ← THÊM
import { firstValueFrom } from 'rxjs'; // ← THÊM
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ProfileResponseDto } from '../dto/profile-response.dto';


@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly httpService: HttpService,
     // ← THÊM HttpService
  ) {}

  async syncUser(dto: any) {
    this.logger.log(`[USER] Sync user in DB: id ${dto.id}, email ${dto.email}`);

    let user = await this.userRepo.findOne({ where: { id: dto.id } });
    if (user) {
      this.logger.log('[USER] User already exists, skipping sync');
      return user;
    }

    const existEmail = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existEmail) {
      throw new ConflictException('Email already in use');
    }

    // KHÔNG lưu password trong user-service
    const newUser = this.userRepo.create({
      id: dto.id,
      email: dto.email,
      name: dto.name,
      // KHÔNG có password field
    });

    const saved = await this.userRepo.save(newUser);
    this.logger.log(`[USER] Synced new user: ${saved.id}`);
    return saved;
  }

  async getUserById(id: number): Promise<ProfileResponseDto> {
    try {
      this.logger.log(`[USER] Fetching profile for id: ${id}`);
      let user = await this.userRepo.findOne({ where: { id } });
      
      if (!user) {
        this.logger.warn(`[USER] User ${id} not found, attempting to create from token`);
        
        // Tạo user mới nếu không tìm thấy
        user = this.userRepo.create({
          id: id,
          email: `user${id}@example.com`,
          name: `User ${id}`,
        });
        
        user = await this.userRepo.save(user);
        this.logger.log(`[USER] Created new user for id: ${id}`);
      }

      this.logger.log(`[USER] Fetched profile for id: ${id}`);
      return new ProfileResponseDto(user);
    } catch (error) {
      this.logger.error(`[USER] Error fetching user ${id}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch user: ${error.message}`);
    }
  }

 async updateProfile(
  id: number, 
  dto: UpdateProfileDto,
  authHeader?: string
): Promise<ProfileResponseDto> {
  try {
    this.logger.log(`[USER] Updating profile for id: ${id}`);

    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const { currentPassword, newPassword } = dto;

    if (newPassword && newPassword.trim() !== '') {
      if (!authHeader) {
        throw new UnauthorizedException('Token missing');
      }

      try {
        await firstValueFrom(
          this.httpService.put(
            'http://localhost:3001/auth/change-password',
            { currentPassword, newPassword },
            {
              headers: {
                'Content-Type': 'application/json',
                'authorization': authHeader // ← VIẾT THƯỜNG + TOKEN CÓ THẬT!
              }
            } as any
          )
        );
      } catch (error: any) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng');
      }
    }

    // Cập nhật thông tin khác...
    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;

    const updated = await this.userRepo.save(user);
    return new ProfileResponseDto(updated);

  } catch (error) {
    throw error;
  }
}
      
}
      
      
