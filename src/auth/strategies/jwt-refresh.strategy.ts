import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { timingSafeEqual } from 'crypto';
import { hashToken } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string,
      passReqToCallback: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  async validate(req: Request, payload: { sub: string }) {
    const refreshToken = req?.cookies?.['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    // Only the latest issued refresh token is valid (rotation + logout revocation).
    if (!user || !user.refreshToken || !user.isActive) throw new UnauthorizedException();
    const given = Buffer.from(hashToken(refreshToken));
    const stored = Buffer.from(user.refreshToken);
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) throw new UnauthorizedException();
    return { id: user.id };
  }
}
