import { Request } from 'express';
import { JwtPayload, JwtPayloadWithRt } from './token.interface';

export interface RequestWithUser extends Request {
  user: JwtPayload;
}

export interface RequestWithUserRefresh extends Request {
  user: JwtPayloadWithRt;
}
