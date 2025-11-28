import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);  

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
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

    const newUser = this.userRepo.create({
      id: dto.id,
      email: dto.email,
      name: dto.name,
    });

    const saved = await this.userRepo.save(newUser);
    this.logger.log(`[USER] Synced new user: ${saved.id}`);
    return saved;
  }

  async getUserById(id: number) {
    try {
      this.logger.log(`[USER] Fetching profile for id: ${id}`);  
      const user = await this.userRepo.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      this.logger.log(`[USER] Fetched profile for id: ${id}`);
      return user;
    } catch (error) {
      this.logger.error(`[USER] Error fetching user ${id}: ${error.message}`);  
      throw new InternalServerErrorException(`Failed to fetch user: ${error.message}`);
    }
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    try {
      const user = await this.userRepo.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      if (dto.email) {
        const existEmail = await this.userRepo.findOne({ where: { email: dto.email } });
        if (existEmail && existEmail.id !== id) {
          throw new ConflictException('Email already in use');
        }
      }

      await this.userRepo.update(id, dto);
      const updated = await this.userRepo.findOne({ where: { id } });
      this.logger.log(`[USER] Updated profile for id: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`[USER] Error updating user ${id}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update profile: ${error.message}`);
    }
  }
}