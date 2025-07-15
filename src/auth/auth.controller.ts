import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpRequest } from './dto/sign-up.dto';
import { SignInRequest } from './dto/sign-in.dto';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import {
  RequestWithUser,
  RequestWithUserRefresh,
} from './interfaces/request-with-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signUp(dto);

    this.setCookies(res, result.tokens);

    return { message: 'Successful registration' };
  }

  @Post('sign-in')
  async signIn(
    @Body() dto: SignInRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(dto);
    this.setCookies(res, result.tokens);
    return { message: 'Successful login' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.sub);
    this.clearCookies(res);
    return { message: 'Successful exit' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(
    @Res({ passthrough: true }) res: Response,
    @Req() req: RequestWithUserRefresh,
  ) {
    const tokens = await this.authService.refreshToken(
      req.user.sub,
      req.user.refreshToken,
    );

    this.setCookies(res, tokens);
    return { message: 'Tokens have been successfully updated' };
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
