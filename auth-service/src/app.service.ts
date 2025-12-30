import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { User } from '../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

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
    const hash = await require('bcrypt').hash(dto.password, 10);  // Keep bcrypt for register/login

    // Create user in auth database
    const newUser = this.userRepo.create({
      email: dto.email,
      password: hash,
      name: dto.name,
    });

    const savedUser = await this.userRepo.save(newUser);

    console.log('[AUTH] User created with id:', savedUser.id);

    // Sync sang user-service (no password)
    try {
      const syncUrl = `${this.configService.get('USER_SERVICE') || process.env.USER_SERVICE}/users/sync`;

      console.log('[AUTH] SYNC URL:', syncUrl);

      await require('@nestjs/axios').firstValueFrom(  // Keep for sync
        require('@nestjs/axios').HttpService.post(syncUrl, {
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
          // No password in sync
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
    const isMatch = await require('bcrypt').compare(dto.password, user.password);
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
}