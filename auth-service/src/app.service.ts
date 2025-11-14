import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly http: HttpService,
    private readonly jwt: JwtService,
  ) {}

  // ========================================================
  // 🔥 Register User + Sync sang user-service
  // ========================================================
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

    // ============================================================
    // 🔥 Sync sang user-service
    // ============================================================
    try {
      const syncUrl = `${process.env.USER_SERVICE}/users/sync`;

      console.log('[AUTH] SYNC URL:', syncUrl);

      await firstValueFrom(
        this.http.post(syncUrl, {
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
        })
      );

      console.log('[AUTH] Sync user-service SUCCESS!');
    } catch (error) {
      console.error('[AUTH] Sync user-service FAILED:', error.message);
    }

    return { message: 'Register successfully' };
  }

  // ========================================================
  // 🔥 Login User
  // ========================================================
  async login(dto: LoginDto) {
    console.log('[AUTH] Login request:', dto);

    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    // Check password
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid email or password');

    // =======================================================
    // 🔥 Sinh JWT
    // =======================================================
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const expiresIn = Number(process.env.JWT_EXPIRE) || 3600;

    const token = this.jwt.sign(payload, { expiresIn });

    console.log('[AUTH] Login SUCCESS for userId:', user.id);
    console.log('[AUTH] JWT expires in:', expiresIn, 'seconds');

    return {
      access_token: token,
    };
  }
}
