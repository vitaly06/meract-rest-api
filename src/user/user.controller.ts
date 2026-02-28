import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@prisma/client';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChangeFullNameDto } from './dto/change-full-name.dto';
import { ChangeUsernameDto } from './dto/change-username.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateCommunicationLanguagesDto } from './dto/update-communication-languages.dto';
import { utcTimeZones } from 'src/common/constants/constants';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Req() req: RequestWithUser) {
    return await this.userService.getCurrentUser(req.user.sub);
  }

  // @UseGuards(JwtAuthGuard)
  // @Post('set-points/:userId')
  // async setPoints(@Query("points") points: string, @Param)

  @ApiTags('Settings (personal data)')
  @UseGuards(JwtAuthGuard)
  @Delete('delete-avatar')
  async deleteAvatar(@Req() req: RequestWithUser) {
    return await this.userService.deleteAvatar(req.user.sub);
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'User avatar image (optional)',
        },
      },
    },
  })
  @ApiTags('Settings (personal data)')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @Post('update-avatar')
  async updateAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    return await this.userService.updateAvatar(req.user.sub, avatar);
  }

  @ApiTags('Settings (personal data)')
  @ApiOperation({
    summary: 'Update full name',
  })
  @UseGuards(JwtAuthGuard)
  @Post('change-full-name')
  async changeFullName(
    @Req() req: RequestWithUser,
    @Body() dto: ChangeFullNameDto,
  ) {
    return await this.userService.changeFullName(req.user.sub, dto.fullName);
  }

  @ApiTags('Settings (personal data)')
  @ApiOperation({
    summary: 'Update username',
  })
  @UseGuards(JwtAuthGuard)
  @Post('change-username')
  async changeUsername(
    @Req() req: RequestWithUser,
    @Body() dto: ChangeUsernameDto,
  ) {
    return await this.userService.changeUsername(req.user.sub, dto.login);
  }

  @ApiTags('Settings (personal data)')
  @ApiOperation({
    summary: 'Returns a list of all time zones.',
  })
  @Get('time-zones')
  async findAllTimeZones() {
    return await this.userService.findAllTimeZones();
  }

  @ApiTags('Settings (notifications)')
  @ApiOperation({
    summary: 'Get notification settings',
  })
  @UseGuards(JwtAuthGuard)
  @Get('notification-settings')
  async getNotificationSettings(@Req() req: RequestWithUser) {
    return await this.userService.getNotificationSettings(req.user.sub);
  }

  @ApiTags('Settings (notifications)')
  @ApiOperation({
    summary: 'Update notification settings',
  })
  @UseGuards(JwtAuthGuard)
  @Post('notification-settings')
  async updateNotificationSettings(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return await this.userService.updateNotificationSettings(req.user.sub, dto);
  }

  @ApiTags('Settings (personal data)')
  @ApiOperation({
    summary: 'Select time zone',
  })
  @ApiQuery({
    name: 'zone',
    enum: utcTimeZones,
  })
  @UseGuards(JwtAuthGuard)
  @Post('select-time-zone')
  async selectTimeZone(
    @Query('zone') zone: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.userService.selectTimeZone(req.user.sub, zone);
  }

  @ApiTags('Settings (languages ​​of communication)')
  @ApiOperation({
    summary: 'List of languages ​​of communication',
  })
  @Get('communication-languages')
  async getCommunicationLangueages() {
    return await this.userService.getCommunicationLanguages();
  }

  @ApiTags('Settings (languages ​​of communication)')
  @ApiOperation({
    summary: 'Get user selected languages',
  })
  @UseGuards(JwtAuthGuard)
  @Get('my-languages')
  async getMyLanguages(@Req() req: RequestWithUser) {
    return await this.userService.getUserLanguages(req.user.sub);
  }

  @ApiTags('Settings (languages ​​of communication)')
  @ApiOperation({
    summary: 'Update user selected languages',
  })
  @UseGuards(JwtAuthGuard)
  @Post('update-languages')
  async updateLanguages(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateCommunicationLanguagesDto,
  ) {
    return await this.userService.updateUserLanguages(
      req.user.sub,
      dto.languages,
    );
  }

  @ApiTags('Settings (personal data)')
  @ApiOperation({ summary: 'Set user country' })
  @UseGuards(JwtAuthGuard)
  @Post('set-country')
  async setCountry(
    @Req() req: RequestWithUser,
    @Body('country') country: string,
  ) {
    return await this.userService.setCountry(req.user.sub, country);
  }

  @ApiTags('Settings (personal data)')
  @ApiOperation({ summary: 'Set user city' })
  @UseGuards(JwtAuthGuard)
  @Post('set-city')
  async setCity(@Req() req: RequestWithUser, @Body('city') city: string) {
    return await this.userService.setCity(req.user.sub, city);
  }

  @ApiOperation({
    summary: 'Get user by id',
  })
  @Get('get-user/:id')
  async findById(@Param('id') id: string): Promise<User> {
    return await this.userService.findById(+id);
  }

  @ApiTags('User Management')
  @Get('all-users')
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }

  @ApiTags('User Management')
  @ApiOperation({
    summary: 'Give a warning to the user',
  })
  @UseGuards(JwtAuthGuard)
  @Post('issue-warning')
  async issueWarning(
    @Query('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.userService.issueWarning(+userId, req);
  }

  @ApiTags('User Management')
  @ApiOperation({
    summary: 'Block user',
  })
  @UseGuards(JwtAuthGuard)
  @Post('block-user')
  async blockUser(
    @Query('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.userService.blockUser(+userId, req);
  }

  @ApiTags('User Management')
  @ApiOperation({
    summary: 'Unblock user',
  })
  @UseGuards(JwtAuthGuard)
  @Post('unblock-user')
  async unblockUser(
    @Query('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.userService.unblockUser(+userId, req);
  }

  @ApiTags('User Management')
  @ApiOperation({
    summary: 'Delete user',
  })
  @UseGuards(JwtAuthGuard)
  @Post('delete-user')
  async deleteUser(
    @Query('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.userService.deleteUser(+userId, req);
  }

  @ApiTags('User Management')
  @ApiOperation({
    summary: 'getting activity log entries for user',
  })
  @Get('activity-logs-for-user')
  async getActivityLogsForUser(@Query('userId') userId: string) {
    return await this.userService.getActivityLogsForUser(+userId);
  }

  @ApiTags('Dashboard')
  @ApiOperation({
    summary: 'get blocks with statistic for admin dashboard',
  })
  @Get('statistic-blocks')
  async getStatisticBlocks() {
    return await this.userService.getStatisticBlocks();
  }

  @ApiTags('Dashboard')
  @ApiOperation({
    summary: 'getting activity log entries',
  })
  @Get('activity-logs')
  async getActivityLogs() {
    return await this.userService.getActivityLogs();
  }

  @Get('all-users-for-guild')
  async allUsersForGuild() {
    return await this.userService.allUsersForGuild();
  }
}
