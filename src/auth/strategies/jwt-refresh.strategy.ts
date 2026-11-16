import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../auth.service';

const fromRefreshCookie = (req: Request): string | null =>
  (req.cookies as Record<string, string | undefined>)?.refresh_token ?? null;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([fromRefreshCookie]),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string }) {
    const refreshToken = fromRefreshCookie(req);
    if (!refreshToken) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    // Only the latest issued refresh token is valid (rotation + logout revocation).
    if (!user?.refreshToken || !user.isActive)
      throw new UnauthorizedException();
    const given = Buffer.from(hashToken(refreshToken));
    const stored = Buffer.from(user.refreshToken);
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
      throw new UnauthorizedException();
    }
    return { id: user.id };
  }
}
