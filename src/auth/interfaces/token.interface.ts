export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface JwtPayload {
  sub: number;
  login: string;
}

export interface JwtPayloadWithRt extends JwtPayload {
  refreshToken: string;
}
