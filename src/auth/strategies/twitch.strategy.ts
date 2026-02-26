import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitch-new';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwitchStrategy extends PassportStrategy(Strategy, 'twitch') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('TWITCH_CLIENT_ID'),
      clientSecret: configService.get<string>('TWITCH_CLIENT_SECRET'),
      callbackURL: configService.get<string>('TWITCH_CALLBACK_URL'),
      scope: 'user:read:email',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const user = {
      twitchId: profile.id,
      email: profile.email || null,
      username: profile.login || profile.display_name,
      displayName: profile.display_name,
      avatar: profile.profile_image_url || null,
      accessToken,
    };
    return user;
  }
}
