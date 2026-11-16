import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { GoogleProfile } from './strategies/google.strategy';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // matches JWT_REFRESH_EXPIRES_IN=7d

// Credential endpoints get a tighter limit than the global one to slow down brute force.
const CREDENTIALS_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle(CREDENTIALS_THROTTLE)
  @Post('register')
  @ApiOperation({ summary: 'Create an account and start a session' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Public()
  @Throttle(CREDENTIALS_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start the Google sign-in flow' })
  googleAuth() {
    // Passport redirects to Google before this handler runs.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google sign-in callback' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken, isNew } =
      await this.authService.googleLogin(req.user as GoogleProfile);
    this.setRefreshCookie(res, refreshToken);
    // The token goes in the URL fragment, which browsers never send to servers or in Referer headers.
    const fragment = new URLSearchParams({ token: accessToken });
    if (isNew) fragment.set('new', 'true');
    res.redirect(
      `${this.config.getOrThrow<string>('FRONTEND_URL')}/auth/callback#${fragment.toString()}`,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the refresh token and clear its cookie' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return this.authService.logout(user.id);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange the refresh cookie for a new access token (rotates it)',
  })
  async refresh(
    @CurrentUser() user: Pick<AuthUser, 'id'>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      user.id,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in user' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // Web (Vercel) and API (Render) live on different sites, so in production the
  // cookie must be SameSite=None + Secure or the browser never sends it to /refresh.
  private cookieOptions(): CookieOptions {
    // RENDER is set by Render itself, so this holds even if NODE_ENV was never configured there.
    const prod = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    return {
      httpOnly: true,
      secure: prod,
      sameSite: prod ? 'none' : 'lax',
      path: '/',
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }
}
