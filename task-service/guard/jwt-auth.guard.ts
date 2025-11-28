import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    console.log('[JWT GUARD TASK] Handle request - user:', user ? JSON.stringify(user) : 'null');
    if (err || !user) {
      console.log('[JWT GUARD TASK] Validation failed:', err?.message || info?.message || 'No user');
      throw err || new UnauthorizedException('Token invalid or expired');
    }
    return user;
  }
}