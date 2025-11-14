import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}


  async syncUser(dto: any) {
    const exist = await this.userRepo.findOne({ where: { id: dto.id } });
    if (exist) return exist;

    const newUser = this.userRepo.create({
      id: dto.id,
      email: dto.email,
      name: dto.name,
    });

    return this.userRepo.save(newUser);
  }


  async getUserById(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return user;
  }


  async updateProfile(id: number, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email) {
      const existEmail = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existEmail && existEmail.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    await this.userRepo.update(id, dto);
    return this.userRepo.findOne({ where: { id } });
  }
}
