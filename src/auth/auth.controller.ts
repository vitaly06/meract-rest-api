import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpRequest } from './dto/sign-up.dto';
import { SignInRequest } from './dto/sign-in.dto';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { JwtRefreshGuard } from 'src/common/guards/jwt-refresh.guard';
import {
  RequestWithGoogleUser,
  RequestWithDiscordUser,
  RequestWithTwitchUser,
  RequestWithUser,
  RequestWithUserRefresh,
} from './interfaces/request-with-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChangePasswordRequest } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Registration',
    description: 'Register a new user with optional avatar upload',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['login', 'email', 'password', 'repassword'],
      properties: {
        login: { type: 'string', example: 'vitaly.sadikov1' },
        fullName: { type: 'string', example: 'Vitaly Sadikov' },
        email: { type: 'string', example: 'vitaly.sadikov1@yandex.ru' },
        password: {
          type: 'string',
          example: '123456',
          minLength: 5,
          maxLength: 20,
        },
        repassword: {
          type: 'string',
          example: '123456',
          minLength: 5,
          maxLength: 20,
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'User avatar image (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or user already exists',
  })
  @ApiTags('Registration')
  @UseInterceptors(FileInterceptor('avatar'))
  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpRequest,
    @Res({ passthrough: true }) res: Response,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return await this.authService.signUp(dto, avatar || null);
  }

  @ApiTags('Registration')
  @Get('verify-email')
  async verifyEmail(
    @Query('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(code);

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

  @ApiTags('Password recovery')
  @Post('forgot-password')
  async forgotPassword(@Query('email') email: string) {
    return await this.authService.forgotPassword(email);
  }

  @ApiTags('Password recovery')
  @Post('forgot-password-verify-code')
  async forgotPasswordVerifyCode(@Query('code') code: string) {
    return await this.authService.forgotPasswordVerifyCode(code);
  }

  @ApiTags('Password recovery')
  @Post('change-password/:id')
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordRequest,
  ) {
    return await this.authService.changePassword(+id, dto);
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

    // Получаем полные данные пользователя с ролью
    const fullUser = await this.userService.findByIdWithRole(user.id);

    const tokens = await this.authService.getTokens(user.id, user.login);
    await this.authService.updateRefreshToken(user.id, tokens.refreshToken);

    this.setCookies(res, tokens);

    // Передаем полные данные пользователя через query параметры
    const userData = encodeURIComponent(JSON.stringify(fullUser));

    res.redirect(`${this.configService.get('FRONTEND_URL')}/?user=${userData}`);
  }

  @ApiOperation({
    summary: 'Authorization with Discord',
  })
  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  async discordAuth() {}

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordAuthRedirect(
    @Req() req: RequestWithDiscordUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Discord authentication failed');
    }

    const discordUser = req.user;

    // Find user by email or create new one
    let user = discordUser.email
      ? await this.userService.findByEmail(discordUser.email)
      : null;

    if (!user) {
      // Create new user if doesn't exist
      user = await this.userService.create({
        login: discordUser.username || `discord_${discordUser.discordId}`,
        email: discordUser.email || `${discordUser.discordId}@discord.user`,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
      });
    }

    // Получаем полные данные пользователя с ролью
    const fullUser = await this.userService.findByIdWithRole(user.id);

    const tokens = await this.authService.getTokens(user.id, user.login);
    await this.authService.updateRefreshToken(user.id, tokens.refreshToken);

    this.setCookies(res, tokens);

    // Передаем полные данные пользователя через query параметры
    const userData = encodeURIComponent(JSON.stringify(fullUser));

    res.redirect(`${this.configService.get('FRONTEND_URL')}/?user=${userData}`);
  }

  @ApiOperation({
    summary: 'Authorization with Twitch',
  })
  @Get('twitch')
  @UseGuards(AuthGuard('twitch'))
  async twitchAuth() {}

  @Get('twitch/callback')
  @UseGuards(AuthGuard('twitch'))
  async twitchAuthRedirect(
    @Req() req: RequestWithTwitchUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Twitch authentication failed');
    }

    const twitchUser = req.user;

    // Find user by email or create new one
    let user = twitchUser.email
      ? await this.userService.findByEmail(twitchUser.email)
      : null;

    if (!user) {
      // Create new user if doesn't exist
      user = await this.userService.create({
        login: twitchUser.username || `twitch_${twitchUser.twitchId}`,
        email: twitchUser.email || `${twitchUser.twitchId}@twitch.user`,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
      });
    }

    // Получаем полные данные пользователя с ролью
    const fullUser = await this.userService.findByIdWithRole(user.id);

    const tokens = await this.authService.getTokens(user.id, user.login);
    await this.authService.updateRefreshToken(user.id, tokens.refreshToken);

    this.setCookies(res, tokens);

    // Передаем полные данные пользователя через query параметры
    const userData = encodeURIComponent(JSON.stringify(fullUser));

    res.redirect(`${this.configService.get('FRONTEND_URL')}/?user=${userData}`);
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
  @UseGuards(JwtRefreshGuard)
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
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: THIRTY_DAYS,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: THIRTY_DAYS,
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
