import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User } from '../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly http: HttpService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Register User + Sync sang user-service
  async register(dto: RegisterDto) {
    console.log('[AUTH] Register payload:', dto);

    // Check email exists
    const exist = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exist) throw new ConflictException('Email already exists');

    // Hash password
    const hash = await bcrypt.hash(dto.password, 10);

    // Create user in auth database
    const newUser = this.userRepo.create({
      email: dto.email,
      password: hash,
      name: dto.name,
    });

    const savedUser = await this.userRepo.save(newUser);

    console.log('[AUTH] User created with id:', savedUser.id);

    // Sync sang user-service với PASSWORD
    try {
      const syncUrl = `${this.configService.get('USER_SERVICE') || process.env.USER_SERVICE}/users/sync`;

      console.log('[AUTH] SYNC URL:', syncUrl);

      // THÊM PASSWORD vào sync data
      await firstValueFrom(
        this.http.post(syncUrl, {
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
          password: savedUser.password, // ← THÊM PASSWORD
        })
      );

      console.log('[AUTH] Sync user-service SUCCESS!');
    } catch (error) {
      console.error('[AUTH] Sync user-service FAILED:', error.message);
      // Không rollback, giữ nguyên code cũ
    }

    return { message: 'Register successfully' };
  }

  // Login User
  async login(dto: LoginDto) {
    console.log('[AUTH] Login request:', dto);

    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    // Check password
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid email or password');

    // Sinh JWT
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const expiresIn = this.configService.get('JWT_EXPIRE') || '24h';

    const token = this.jwt.sign(payload, { 
      secret: this.configService.get('JWT_SECRET') || process.env.JWT_SECRET,
      expiresIn 
    });

    console.log('[AUTH] Login SUCCESS for userId:', user.id);
    console.log('[AUTH] JWT expires in:', expiresIn);

    return {
      access_token: token,
    };
  }

  // ========== THÊM 2 METHODS MỚI ==========

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    this.logger.log(`[AUTH] Verifying password for user ${userId}`);
    
    const user = await this.userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
      this.logger.warn(`[AUTH] User ${userId} not found for password verification`);
      return false;
    }
    
    if (!user.password) {
      this.logger.warn(`[AUTH] User ${userId} has no password set`);
      return false;
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    this.logger.log(`[AUTH] Password verification for user ${userId}: ${isValid}`);
    
    return isValid;
  }

  async changePassword(
  userId: number,
  newPassword: string,    
  currentPassword?: string 
): Promise<void> {
  this.logger.log(`[AUTH] Changing password for user ${userId}`);
  
  const user = await this.userRepo.findOne({ where: { id: userId } });
  
  if (!user) {
    throw new BadRequestException('User not found');
  }
  
  // VALIDATE NEW PASSWORD
  if (newPassword.length < 6) {
    throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
  }
  
  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
    throw new BadRequestException('Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số');
  }
  
  // Nếu có currentPassword, verify nó
  if (currentPassword && currentPassword.trim() !== '') {
    if (!user.password) {
      throw new BadRequestException('Tài khoản chưa có mật khẩu');
    }
    
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }
    this.logger.log(`[AUTH] Current password verified for user ${userId}`);
  }
  // Nếu không có currentPassword (trường hợp đặt password lần đầu)
  else {
    this.logger.log(`[AUTH] Setting first password for user ${userId}`);
  }
  
  // Hash và lưu password mới
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  
  await this.userRepo.save(user);
  
  this.logger.log(`[AUTH] Password changed for user ${userId}`);
}
  }
