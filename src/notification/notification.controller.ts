import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get my notifications (paginated)' })
  @Get()
  async getMyNotifications(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.notificationService.getForUser(
      req.user.sub,
      limit ? +limit : 30,
      before ? +before : undefined,
    );
  }

  @ApiOperation({ summary: 'Get unread notifications count' })
  @Get('unread-count')
  async getUnreadCount(@Req() req: RequestWithUser) {
    return this.notificationService.getUnreadCount(req.user.sub);
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.notificationService.markRead(+id, req.user.sub);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('read-all')
  async markAllRead(@Req() req: RequestWithUser) {
    return this.notificationService.markAllRead(req.user.sub);
  }

  @ApiOperation({ summary: 'Delete a notification' })
  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.notificationService.deleteNotification(+id, req.user.sub);
  }
}
