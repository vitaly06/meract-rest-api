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
