import { Request } from 'express';
import { JwtPayload, JwtPayloadWithRt } from './token.interface';

export interface RequestWithUser extends Request {
  user: JwtPayload;
}

export interface RequestWithUserRefresh extends Request {
  user: JwtPayloadWithRt;
}

export interface RequestWithGoogleUser extends Request {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    accessToken: string;
  };
}

export interface RequestWithDiscordUser extends Request {
  user: {
    discordId: string;
    email: string;
    username: string;
    displayName: string;
    avatar: string | null;
    accessToken: string;
  };
}

export interface RequestWithTwitchUser extends Request {
  user: {
    twitchId: string;
    email: string;
    username: string;
    displayName: string;
    avatar: string;
    accessToken: string;
  };
}
