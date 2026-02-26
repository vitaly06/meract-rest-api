import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-discord-auth';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientId: configService.get<string>('DISCORD_CLIENT_ID'),
      clientSecret: configService.get<string>('DISCORD_CLIENT_SECRET'),
      callbackUrl: configService.get<string>('DISCORD_CALLBACK_URL'),
      scope: ['identify', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const user = {
      discordId: profile.id,
      email: profile.email,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      avatar: profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null,
      accessToken,
    };
    return user;
  }
}
