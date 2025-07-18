import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpRequest } from './dto/sign-up.dto';
import { SignInRequest } from './dto/sign-in.dto';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import {
  RequestWithGoogleUser,
  RequestWithUser,
  RequestWithUserRefresh,
} from './interfaces/request-with-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Registration',
  })
  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signUp(dto);

    this.setCookies(res, result.tokens);

    return result.user;
  }

  @ApiOperation({
    summary: 'Authorization',
  })
  @ApiQuery({
    name: 'admin',
    required: false,
  })
  @Post('sign-in')
  async signIn(
    @Body() dto: SignInRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('admin') admin?: string,
  ) {
    const result = await this.authService.signIn(dto, admin || null);
    this.setCookies(res, result.tokens);
    return result.checkUser;
  }

  @ApiOperation({
    summary: 'Authorization with google',
  })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: RequestWithGoogleUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Google authentication failed');
    }

    const googleUser = req.user;

    let user = await this.userService.findByEmail(googleUser.email);

    if (!user) {
      // Create new user if doesn't exist
      user = await this.userService.create({
        login: googleUser.email,
        email: googleUser.email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
      });
    }

    const tokens = await this.authService.getTokens(user.id, user.login);
    await this.authService.updateRefreshToken(user.id, tokens.refreshToken);

    this.setCookies(res, tokens);

    res.redirect(`${this.configService.get('FRONTEND_URL')}/`);
  }

  @ApiOperation({
    summary: 'Exit from the system',
  })
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

  @ApiOperation({
    summary: 'Update tokens',
  })
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
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: false,
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
