import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GuildService } from './guild.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateGuildRequest } from './dto/create-guild.dto';
import { Multer } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { UpdateGuildRequest } from './dto/update-guild.dto';

@Controller('guild')
export class GuildController {
  constructor(private readonly guildService: GuildService) {}

  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        tags: {
          type: 'string',
          description: 'JSON-массив тегов, напр. ["adventure","quest"]',
          example: '["adventure","quest"]',
        },
        photo: {
          type: 'string',
          format: 'binary',
        },
        cover: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Create guild',
  })
  @ApiConsumes('multipart/form-data')
  @Post('create-guild')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
  )
  @UseGuards(JwtAuthGuard)
  async createGuild(
    @Body() dto: CreateGuildRequest,
    @Req() req: RequestWithUser,
    @UploadedFiles()
    files: { photo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    return await this.guildService.createGuild(
      dto,
      req,
      files?.photo?.[0] || null,
      files?.cover?.[0] || null,
    );
  }

  @Get('find-all')
  async findAll() {
    return await this.guildService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-my-guild')
  async getMyGuild(@Req() req: RequestWithUser) {
    return await this.guildService.getMyGuild(req.user.sub);
  }

  @ApiOperation({
    summary: 'Find guild by id',
  })
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.guildService.findById(+id);
  }

  @ApiOperation({
    summary: 'Update guild information',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        tags: {
          type: 'string',
          description: 'JSON-массив тегов, напр. ["adventure","quest"]',
          example: '["adventure","quest"]',
        },
        photo: {
          type: 'string',
          format: 'binary',
        },
        cover: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
  )
  @UseGuards(JwtAuthGuard)
  async updateGuild(
    @Param('id') id: string,
    @Body() dto: UpdateGuildRequest,
    @UploadedFiles()
    files: { photo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    return await this.guildService.updateGuild(
      +id,
      dto,
      files?.photo?.[0] || null,
      files?.cover?.[0] || null,
    );
  }

  @ApiTags('Guild requests')
  @ApiOperation({
    summary: 'Submit a request (join to guild)',
  })
  @Post('submit-request/:guildId')
  @UseGuards(JwtAuthGuard)
  async submitRequest(
    @Param('guildId') guildId: string,
    @Req() req: RequestWithUser,
    @Body() body: { message?: string },
  ) {
    return await this.guildService.submitJoinRequest(
      +guildId,
      req.user.sub,
      body.message,
    );
  }

  @ApiTags('Guild requests')
  @ApiOperation({
    summary: 'Get join requests for a guild (owner only)',
  })
  @Get(':guildId/join-requests')
  @UseGuards(JwtAuthGuard)
  async getJoinRequests(
    @Param('guildId') guildId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.getJoinRequests(+guildId, req.user.sub);
  }

  @ApiTags('Guild requests')
  @ApiOperation({
    summary: 'Approve a join request (owner only)',
  })
  @Post('join-requests/:requestId/approve')
  @UseGuards(JwtAuthGuard)
  async approveJoinRequest(
    @Param('requestId') requestId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.handleJoinRequest(
      +requestId,
      req.user.sub,
      'approved',
    );
  }

  @ApiTags('Guild requests')
  @ApiOperation({
    summary: 'Reject a join request (owner only)',
  })
  @Post('join-requests/:requestId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectJoinRequest(
    @Param('requestId') requestId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.handleJoinRequest(
      +requestId,
      req.user.sub,
      'rejected',
    );
  }
  @ApiTags('Guild requests')
  @ApiOperation({
    summary: 'Adding a user to a guild',
  })
  @Post('invite-user')
  @UseGuards(JwtAuthGuard)
  async inviteUser(
    @Query('user') user: string,
    @Query('guildId') guildId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.inviteUser(user, +guildId, req.user.sub);
  }

  @ApiTags('Guild requests')
  @ApiOperation({
    summary: 'Delete user from guild',
  })
  @Post('kick-out-user')
  @UseGuards(JwtAuthGuard)
  async kickOutUser(
    @Query('userId') userId: string,
    @Query('guildId') guildId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.kickOutUser(+userId, +guildId, req.user.sub);
  }

  @ApiTags('Guild requests')
  @ApiOperation({ summary: 'Get my guild invites' })
  @Get('invites/my')
  @UseGuards(JwtAuthGuard)
  async getMyInvites(@Req() req: RequestWithUser) {
    return await this.guildService.getMyInvites(req.user.sub);
  }

  @ApiTags('Guild requests')
  @ApiOperation({ summary: 'Accept guild invite' })
  @Post(':guildId/invite/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvite(
    @Param('guildId') guildId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.respondToInvite(+guildId, req.user.sub, true);
  }

  @ApiTags('Guild requests')
  @ApiOperation({ summary: 'Reject guild invite' })
  @Post(':guildId/invite/reject')
  @UseGuards(JwtAuthGuard)
  async rejectInvite(
    @Param('guildId') guildId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.respondToInvite(+guildId, req.user.sub, false);
  }

  @ApiTags('Guild Achievements')
  @ApiOperation({ summary: 'Reorder guild achievements (owner/admin)' })
  @Patch(':guildId/achievements/reorder')
  @UseGuards(JwtAuthGuard)
  async reorderAchievements(
    @Param('guildId') guildId: string,
    @Req() req: RequestWithUser,
    @Body() body: { items: { achievementId: number; order: number }[] },
  ) {
    return await this.guildService.reorderAchievements(
      +guildId,
      req.user.sub,
      body.items,
    );
  }

  @ApiTags('Guild Achievements')
  @ApiOperation({
    summary: 'Toggle featured status of guild achievement (owner/admin)',
  })
  @Patch(':guildId/achievements/:achievementId/featured')
  @UseGuards(JwtAuthGuard)
  async toggleFeaturedAchievement(
    @Param('guildId') guildId: string,
    @Param('achievementId') achievementId: string,
    @Req() req: RequestWithUser,
    @Body() body: { featured: boolean },
  ) {
    return await this.guildService.toggleFeaturedAchievement(
      +guildId,
      +achievementId,
      req.user.sub,
      body.featured,
    );
  }

  @ApiOperation({
    summary: 'Включить/выключить уведомления гильдии',
    description: 'Toggle. Возвращает { muted: true/false }',
  })
  @Patch(':id/notifications/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleNotifications(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.toggleGuildNotifications(+id, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteGuild(@Param('id') id: string, @Req() req: RequestWithUser) {
    return await this.guildService.deleteGuild(+id, req);
  }

  @ApiOperation({
    summary: 'Transfer guild ownership to another member',
  })
  @Patch(':guildId/owner/transfer')
  @UseGuards(JwtAuthGuard)
  async transferOwner(
    @Param('guildId') guildId: string,
    @Body() body: { newOwnerId: number },
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.transferOwner(+guildId, body.newOwnerId, req.user.sub);
  }

  @ApiOperation({
    summary: 'Set or remove admin role from guild member',
  })
  @Patch(':guildId/members/:userId/admin')
  @UseGuards(JwtAuthGuard)
  async setMemberAdmin(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body() body: { isAdmin: boolean },
    @Req() req: RequestWithUser,
  ) {
    return await this.guildService.setMemberAdmin(+guildId, +userId, body.isAdmin, req.user.sub);
  }
}
