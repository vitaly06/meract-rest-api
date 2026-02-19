import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MailerService } from '@nestjs-modules/mailer';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignUpRequest } from './dto/sign-up.dto';
import { UserService } from 'src/user/user.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SignInRequest } from './dto/sign-in.dto';
import { JwtPayload } from './interfaces/token.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { S3Service } from 'src/s3/s3.service';
import { use } from 'passport';
import { ChangePasswordRequest } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly mailerService: MailerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async signUp(dto: SignUpRequest, file: Express.Multer.File | null) {
    const { login, email, password, repassword } = { ...dto };
    let s3Data = null;
    // Load avatar to S3
    if (file) {
      s3Data = await this.s3Service.uploadFile(file);
    }

    const checkUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ login }, { email }],
      },
    });

    if (checkUser) {
      throw new BadRequestException('This user is already registered');
    }

    if (password != repassword) {
      throw new BadRequestException("The passwords don't match");
    }

    const checkRole = await this.prisma.role.findFirst({
      where: { name: 'user' },
    });

    if (!checkRole) {
      throw new BadRequestException('The user role does not exist.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const cashedData = {
      login,
      email,
      password: hashedPassword,
      fullName: dto.fullName || null,
      avatarUrl: s3Data?.url || null,
      role: { connect: { id: checkRole.id } },
    };
    // Generate Verify code
    const verifyCode = await this.generateVerifyCode();
    // comment this in dev mode
    console.log('Verify email:', verifyCode);

    await this.cacheManager.set(
      `verify-email:${verifyCode}`,
      JSON.stringify(cashedData),
      3600 * 1000,
    );

    await this.sendVerificationEmail(
      email,
      'Verify email',
      verifyCode,
      'email-verification',
    );

    return {
      message:
        'The email with the confirmation code has been sent successfully.',
    };
  }

  async forgotPassword(email: string) {
    const checkUser = await this.userService.findByEmail(email);

    if (!checkUser) {
      throw new NotFoundException('User not found');
    }

    // Generate Verify code
    const verifyCode = await this.generateVerifyCode();
    // comment this in dev mode
    console.log('Verify email for recovery password:', verifyCode);

    await this.cacheManager.set(
      `verify-email-for-recovery:${verifyCode}`,
      JSON.stringify(email),
      3600 * 1000,
    );

    await this.sendVerificationEmail(
      email,
      'Recovery Password',
      verifyCode,
      'email-verification-recovery',
    );

    return {
      message:
        'The email with the confirmation code has been sent successfully.',
    };
  }

  async forgotPasswordVerifyCode(code: string) {
    const cachedData = await this.cacheManager.get<string>(
      `verify-email-for-recovery:${code}`,
    );

    if (!cachedData) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const email = JSON.parse(cachedData); // email - это строка, не объект

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheManager.del(`verify-email-for-recovery:${code}`);

    await this.cacheManager.set(
      `user-id-for-recovery:${user.id}`,
      JSON.stringify(user.id),
      3600 * 1000,
    );

    return { message: 'Success! Enter your new password.', userId: user.id };
  }

  async changePassword(id: number, dto: ChangePasswordRequest) {
    const cachedData = await this.cacheManager.get<string>(
      `user-id-for-recovery:${id}`,
    );

    if (!cachedData) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const checkUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!checkUser) {
      throw new NotFoundException('User not found');
    }

    const { password, repassword } = { ...dto };

    if (password != repassword) {
      throw new BadRequestException("The passwords don't match");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const res = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    await this.cacheManager.del(`user-id-for-recovery:${id}`);

    return {
      message: 'Password successfully changed',
      user: res,
    };
  }

  async verifyEmail(code: string) {
    const cachedData = await this.cacheManager.get<string>(
      `verify-email:${code}`,
    );

    if (!cachedData) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const registrationData = JSON.parse(cachedData);

    const user = await this.prisma.user.create({
      data: {
        ...registrationData,
      },
    });

    const tokens = await this.getTokens(user.id, user.login);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    await this.cacheManager.del(`verify-email:${code}`);

    return { tokens, user };
  }

  async signIn(dto: SignInRequest, admin: string) {
    const { email, password } = { ...dto };
    const checkUser = await this.userService.findByEmail(email);
    if (!checkUser) {
      throw new UnauthorizedException('User does not exist');
    }

    const passwordMatch = await bcrypt.compare(password, checkUser.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid password');
    }
    if (admin) {
      const role = await this.prisma.role.findUnique({
        where: { name: 'admin' },
      });
      const secondRole = await this.prisma.role.findUnique({
        where: { name: 'main admin' },
      });
      if (checkUser.roleId != role.id && checkUser.roleId != secondRole.id) {
        throw new UnauthorizedException('Insufficient rights');
      }
    }

    const tokens = await this.getTokens(checkUser.id, checkUser.login);
    await this.updateRefreshToken(checkUser.id, tokens.refreshToken);
    return { tokens, checkUser };
  }

  async logout(userId: number) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });
  }

  async refreshToken(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    if (refreshToken !== user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.getTokens(user.id, user.login);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken,
      },
    });
  }

  async getTokens(userId: number, login: string) {
    const payload: JwtPayload = { sub: userId, login };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async generateVerifyCode(): Promise<string> {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4 digits (1000-9999)
  }

  private async sendVerificationEmail(
    email: string,
    text: string,
    code: string,
    template: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: text,
        template,
        context: {
          code,
        },
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new BadRequestException('Error sending confirmation email');
    }
  }
}
