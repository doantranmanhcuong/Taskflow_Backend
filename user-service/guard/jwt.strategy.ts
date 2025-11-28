import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get('JWT_SECRET')?.trim();  // Trim space
    if (!secret) {
      console.error('[JWT] ERROR: JWT_SECRET missing!');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const authHeader = request.headers.authorization;  // Raw header
          console.log('[JWT] Raw header from request:', authHeader);  // Log raw
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[JWT] Header format invalid or missing Bearer');
            return null;
          }
          const token = authHeader.substring(7);  // Remove 'Bearer ' (7 chars)
          console.log('[JWT] Extracted token preview:', token.substring(0, 50) + '...');
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),  // Fallback standard
      ]),
      ignoreExpiration: true,  // Tạm true
      secretOrKey: secret,
    });
    console.log('[JWT] Strategy initialized with secret preview: ' + (secret || 'MISSING').substring(0, 10) + '...');
  }

  async validate(payload: any) {
    console.log('[JWT] Validating token - raw payload:', JSON.stringify(payload || {}));
    const secret = this.configService.get('JWT_SECRET')?.trim();
    console.log('[JWT] Verify with secret preview:', secret.substring(0, 10) + '...');
    console.log('[JWT] Token expiry check - exp:', payload.exp, 'current time:', Math.floor(Date.now() / 1000));

    if (!payload || typeof payload !== 'object') {
      console.log('[JWT] Invalid payload type');
      throw new UnauthorizedException('Invalid token structure');
    }

    if (!payload.sub) {
      console.log('[JWT] Missing sub (userId) in payload');
      throw new UnauthorizedException('Invalid token - missing user ID');
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[JWT] Token expired');
      throw new UnauthorizedException('Token expired');
    }

    console.log('[JWT] Validation success for userId:', payload.sub);
    return { 
      userId: payload.sub, 
      email: payload.email, 
      name: payload.name 
    };
  }
}