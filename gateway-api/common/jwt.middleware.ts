import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    let authHeader =
      req.headers['authorization'] ||
      req.headers['Authorization'] ||
      req.headers['AUTHORIZATION'];

    // Nếu không có Authorization → cho đi tiếp (route public)
    if (!authHeader) return next();

    // Nếu dạng "Authorization: Bearer token"
    if (authHeader.startsWith('Authorization:')) {
      authHeader = authHeader.replace('Authorization:', '').trim();
    }

    authHeader = authHeader.trim();

    // Không phải "Bearer token" thì bỏ qua
    if (!authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const secret = process.env.JWT_SECRET;

      if (!secret) {
        throw new UnauthorizedException('Missing JWT_SECRET');
      }

      // ép kiểu secret về string để tránh lỗi TypeScript
      const decoded: any = jwt.verify(token, secret as string);

      req.user = decoded;
      req.userId = decoded.sub;

      // Task-service & User-service cần header này
      req.headers['x-user-id'] = String(decoded.sub);

      next();
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
