import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { authenticator } from '@otplib/preset-default';
import * as QRCode from 'qrcode';

@Injectable()
export class SecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private async sendCode(email: string, code: string) {
    console.log(`[Security] Code for ${email}: ${code}`);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Security code',
        template: 'email-verification',
        context: { code },
      });
    } catch {
      // fallback to console in dev
    }
  }

  // ─── Change Email ─────────────────────────────────────────────────────────

  /** Step 1: Send code to current email */
  async changeEmailStep1(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const code = this.generateCode();
    await this.cacheManager.set(
      `change-email-step1:${userId}`,
      code,
      10 * 60 * 1000, // 10 min
    );

    await this.sendCode(user.email, code);
    return { message: 'Verification code sent to your current email' };
  }

  /** Step 2: Verify code from current email */
  async changeEmailStep2(userId: number, code: string) {
    const cached = await this.cacheManager.get<string>(
      `change-email-step1:${userId}`,
    );
    if (!cached || cached !== code) {
      throw new BadRequestException('Invalid or expired code');
    }

    await this.cacheManager.del(`change-email-step1:${userId}`);
    // Mark user as passed step1
    await this.cacheManager.set(
      `change-email-step1-ok:${userId}`,
      '1',
      10 * 60 * 1000,
    );

    return { message: 'Code verified. Now enter your new email.' };
  }

  /** Step 3: Send code to new email */
  async changeEmailStep3(userId: number, newEmail: string) {
    const ok = await this.cacheManager.get(`change-email-step1-ok:${userId}`);
    if (!ok) {
      throw new BadRequestException('Please complete step 1 first');
    }

    const exists = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });
    if (exists) {
      throw new BadRequestException('This email is already in use');
    }

    const code = this.generateCode();
    await this.cacheManager.set(
      `change-email-new:${userId}`,
      JSON.stringify({ code, newEmail }),
      10 * 60 * 1000,
    );
    await this.cacheManager.del(`change-email-step1-ok:${userId}`);

    await this.sendCode(newEmail, code);
    return { message: 'Verification code sent to your new email' };
  }

  /** Step 4: Verify code from new email & actually change it */
  async changeEmailConfirm(userId: number, code: string) {
    const cached = await this.cacheManager.get<string>(
      `change-email-new:${userId}`,
    );
    if (!cached) throw new BadRequestException('Invalid or expired code');

    const { code: storedCode, newEmail } = JSON.parse(cached);
    if (storedCode !== code) {
      throw new BadRequestException('Invalid code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });
    await this.cacheManager.del(`change-email-new:${userId}`);

    return { message: 'Email successfully changed' };
  }

  // ─── Change Password ──────────────────────────────────────────────────────

  /** Step 1: Send code to current email */
  async changePasswordStep1(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const code = this.generateCode();
    await this.cacheManager.set(
      `change-password:${userId}`,
      code,
      10 * 60 * 1000,
    );

    await this.sendCode(user.email, code);
    return { message: 'Verification code sent to your email' };
  }

  /** Step 2: Verify code and set new password */
  async changePasswordConfirm(
    userId: number,
    code: string,
    password: string,
    repassword: string,
  ) {
    const cached = await this.cacheManager.get<string>(
      `change-password:${userId}`,
    );
    if (!cached || cached !== code) {
      throw new BadRequestException('Invalid or expired code');
    }

    if (password !== repassword) {
      throw new BadRequestException("Passwords don't match");
    }

    const hashed = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    await this.cacheManager.del(`change-password:${userId}`);

    return { message: 'Password successfully changed' };
  }

  // ─── Google Authenticator (2FA) ───────────────────────────────────────────

  async generate2FA(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'Meract', secret);

    // Store secret temporarily until user confirms
    await this.cacheManager.set(`2fa-secret:${userId}`, secret, 10 * 60 * 1000);

    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    return { qrCode, secret };
  }

  async enable2FA(userId: number, token: string) {
    const secret = await this.cacheManager.get<string>(`2fa-secret:${userId}`);
    if (!secret) {
      throw new BadRequestException(
        'No pending 2FA setup. Please generate QR first.',
      );
    }

    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      throw new BadRequestException('Invalid authenticator code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: true },
    });
    await this.cacheManager.del(`2fa-secret:${userId}`);

    return { message: '2FA successfully enabled' };
  }

  async disable2FA(userId: number, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });
    if (!isValid) {
      throw new BadRequestException('Invalid authenticator code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });

    return { message: '2FA successfully disabled' };
  }

  async get2FAStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { enabled: user.twoFactorEnabled };
  }

  // ─── Who Can Message ──────────────────────────────────────────────────────

  async getWhoCanMessage(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { whoCanMessage: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { whoCanMessage: user.whoCanMessage };
  }

  async setWhoCanMessage(userId: number, setting: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { whoCanMessage: setting },
    });
    return { message: 'Setting updated successfully' };
  }
}
