import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

/** What the Google strategy attaches to `req.user`. */
export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.find((e) => e.verified)?.value;
    // Accounts are linked by email, so an unverified address must never sign anyone in.
    if (!email) return false;
    return {
      googleId: profile.id,
      email,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value,
    } satisfies GoogleProfile;
  }
}
