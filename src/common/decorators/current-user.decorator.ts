import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** The user attached to the request by `JwtStrategy.validate`. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request>().user as AuthUser,
);
