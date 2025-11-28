import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get('JWT_SECRET');
    if (!secret) {
      console.error('[JWT TASK] ERROR: JWT_SECRET missing!');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,  // Tạm true
      secretOrKey: secret,
    });
    console.log('[JWT TASK] Strategy secret preview:', secret.substring(0, 10) + '...');
  }

  async validate(payload: any) {
    console.log('[JWT TASK] Validating token - raw payload:', JSON.stringify(payload || {}));
    const secret = this.configService.get('JWT_SECRET');
    console.log('[JWT TASK] Verify with secret preview:', secret.substring(0, 10) + '...');

    if (!payload || typeof payload !== 'object') {
      console.log('[JWT TASK] Invalid payload type');
      throw new UnauthorizedException('Invalid token structure');
    }

    if (!payload.sub) {
      console.log('[JWT TASK] Missing sub in payload');
      throw new UnauthorizedException('Invalid token - missing user ID');
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[JWT TASK] Token expired');
      throw new UnauthorizedException('Token expired');
    }

    console.log('[JWT TASK] Validation success for userId:', payload.sub);
    return { 
      userId: payload.sub, 
      email: payload.email, 
      name: payload.name 
    };
  }
}