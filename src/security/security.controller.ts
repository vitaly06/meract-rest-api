import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { SecurityService } from './security.service';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { WhoCanMessageDto } from './dto/who-can-message.dto';

@ApiTags('Security settings')
@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  // ─── Change Email ───────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Step 1 — Send verification code to current email',
  })
  @Post('change-email/send-code')
  async changeEmailStep1(@Req() req: RequestWithUser) {
    return await this.securityService.changeEmailStep1(req.user.sub);
  }

  @ApiOperation({
    summary: 'Step 2 — Verify code from current email',
  })
  @ApiQuery({ name: 'code', required: true })
  @Post('change-email/verify-code')
  async changeEmailStep2(
    @Req() req: RequestWithUser,
    @Query('code') code: string,
  ) {
    return await this.securityService.changeEmailStep2(req.user.sub, code);
  }

  @ApiOperation({
    summary: 'Step 3 — Enter new email (sends code to new email)',
  })
  @Post('change-email/set-new-email')
  async changeEmailStep3(
    @Req() req: RequestWithUser,
    @Body() dto: ChangeEmailDto,
  ) {
    return await this.securityService.changeEmailStep3(
      req.user.sub,
      dto.newEmail,
    );
  }

  @ApiOperation({
    summary: 'Step 4 — Verify code from new email & apply change',
  })
  @ApiQuery({ name: 'code', required: true })
  @Post('change-email/confirm')
  async changeEmailConfirm(
    @Req() req: RequestWithUser,
    @Query('code') code: string,
  ) {
    return await this.securityService.changeEmailConfirm(req.user.sub, code);
  }

  // ─── Change Password ────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Step 1 — Send verification code to email for password change',
  })
  @Post('change-password/send-code')
  async changePasswordStep1(@Req() req: RequestWithUser) {
    return await this.securityService.changePasswordStep1(req.user.sub);
  }

  @ApiOperation({
    summary: 'Step 2 — Verify code and set new password',
  })
  @ApiQuery({ name: 'code', required: true })
  @Post('change-password/confirm')
  async changePasswordConfirm(
    @Req() req: RequestWithUser,
    @Query('code') code: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return await this.securityService.changePasswordConfirm(
      req.user.sub,
      code,
      dto.password,
      dto.repassword,
    );
  }

  // ─── Google Authenticator (2FA) ─────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get 2FA status (enabled/disabled)',
  })
  @Get('2fa/status')
  async get2FAStatus(@Req() req: RequestWithUser) {
    return await this.securityService.get2FAStatus(req.user.sub);
  }

  @ApiOperation({
    summary: 'Generate QR code to set up Google Authenticator',
  })
  @Post('2fa/generate')
  async generate2FA(@Req() req: RequestWithUser) {
    return await this.securityService.generate2FA(req.user.sub);
  }

  @ApiOperation({
    summary: 'Enable 2FA — confirm with code from authenticator app',
  })
  @ApiQuery({ name: 'token', description: '6-digit TOTP code', required: true })
  @Post('2fa/enable')
  async enable2FA(@Req() req: RequestWithUser, @Query('token') token: string) {
    return await this.securityService.enable2FA(req.user.sub, token);
  }

  @ApiOperation({
    summary: 'Disable 2FA — confirm with code from authenticator app',
  })
  @ApiQuery({ name: 'token', description: '6-digit TOTP code', required: true })
  @Post('2fa/disable')
  async disable2FA(@Req() req: RequestWithUser, @Query('token') token: string) {
    return await this.securityService.disable2FA(req.user.sub, token);
  }

  // ─── Who Can Message ────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get current "who can message me" setting',
  })
  @Get('who-can-message')
  async getWhoCanMessage(@Req() req: RequestWithUser) {
    return await this.securityService.getWhoCanMessage(req.user.sub);
  }

  @ApiOperation({
    summary:
      'Set who can send messages: all | act_participants | guild_members',
  })
  @Post('who-can-message')
  async setWhoCanMessage(
    @Req() req: RequestWithUser,
    @Body() dto: WhoCanMessageDto,
  ) {
    return await this.securityService.setWhoCanMessage(
      req.user.sub,
      dto.setting,
    );
  }
}
