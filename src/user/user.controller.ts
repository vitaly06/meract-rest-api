import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
