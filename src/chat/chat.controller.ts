import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { ChatService } from './chat.service';
import { CreateGroupChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── Chat list ───────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Список чатов',
    description:
      'Возвращает все чаты пользователя: личные, групповые и гильдийные. ' +
      'Содержит аватар/логин собеседника, последнее сообщение, кол-во непрочитанных.',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Get()
  async getChats(
    @Req() req: RequestWithUser,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.getChats(req.user.sub, actId);
  }

  // ─── Direct chat ─────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить или создать личный чат с пользователем',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Post('direct/:userId')
  async getOrCreateDirectChat(
    @Req() req: RequestWithUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.getOrCreateDirectChat(req.user.sub, userId, actId);
  }

  // ─── Group chat ───────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Создать групповой чат',
    description:
      'name обязателен. participantIds — JSON-массив в multipart. Файл (image/video) — опционально.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'participantIds'],
      properties: {
        name: { type: 'string', example: 'Команда А' },
        participantIds: {
          type: 'string',
          example: '[1,2,3]',
          description: 'JSON-массив ID участников',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Обложка чата (опционально)',
        },
        act_id: {
          type: 'number',
          description: 'ID действия для аналитики (опционально)',
        },
      },
    },
  })
  @Post('group')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async createGroupChat(
    @Req() req: RequestWithUser,
    @Body() dto: CreateGroupChatDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.chatService.createGroupChat(req.user.sub, dto, file);
  }

  // ─── Guild chat ───────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить или создать чат гильдии',
    description:
      'Возвращает chatId для чата гильдии. Доступно только членам гильдии.',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Post('guild/:guildId')
  async getOrCreateGuildChat(
    @Req() req: RequestWithUser,
    @Param('guildId', ParseIntPipe) guildId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.getOrCreateGuildChat(req.user.sub, guildId, actId);
  }

  // ─── Messages ────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить сообщения чата (пагинация курсором)',
    description:
      'limit по умолчанию 50. before — ID сообщения для загрузки более старых.',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Get(':chatId/messages')
  async getMessages(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.getMessages(
      chatId,
      req.user.sub,
      limit ? +limit : 50,
      before ? +before : undefined,
      actId,
    );
  }

  // ─── Send message ─────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Отправить сообщение',
    description:
      'text, replyToId и forwardedFromId — опциональны в multipart-теле. ' +
      'Прикрепить файл (image/video/audio/голосовое) — поле file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          example: 'Привет!',
          description: 'Текст сообщения',
        },
        replyToId: {
          type: 'number',
          example: 5,
          description: 'ID сообщения-ответа',
        },
        forwardedFromId: {
          type: 'number',
          example: 10,
          description: 'ID пересылаемого сообщения',
        },
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Вложение: изображение, видео, аудио или голосовое (audio/ogg, audio/webm)',
        },
        act_id: {
          type: 'number',
          description: 'ID действия для аналитики (опционально)',
        },
      },
    },
  })
  @Post(':chatId/messages')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async sendMessage(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() dto: SendMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.chatService.sendMessage(chatId, req.user.sub, dto, file);
  }

  // ─── Delete message ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Удалить своё сообщение (soft delete)' })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Delete('messages/:messageId')
  async deleteMessage(
    @Req() req: RequestWithUser,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.deleteMessage(messageId, req.user.sub, actId);
  }

  // ─── Add member ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Добавить участника в групповой чат' })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Post(':chatId/members/:userId')
  async addMember(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.addMember(chatId, req.user.sub, targetUserId, actId);
  }

  // ─── Mark as read ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Отметить чат как прочитанный' })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Patch(':chatId/read')
  async markAsRead(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.markAsRead(chatId, req.user.sub, actId);
  }

  // ─── Invite link ──────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить или создать ссылку-приглашение для чата',
    description: 'Доступно только для групповых и гильдийных чатов.',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Get(':chatId/invite')
  async getInviteCode(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.generateInviteCode(chatId, req.user.sub, actId);
  }

  @ApiOperation({
    summary: 'Вступить в чат по коду приглашения',
    description:
      'Пользователь присоединяется к групповому/гильдийному чату по invite-коду.',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Post('join/:code')
  async joinByInviteCode(
    @Req() req: RequestWithUser,
    @Param('code') code: string,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.joinByInviteCode(code, req.user.sub, actId);
  }

  // ─── Media queries ────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить все изображения чата',
    description: 'Пагинация по cursor (before = ID). limit по умолчанию 30.',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Get(':chatId/media/images')
  async getChatImages(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.getChatImages(
      chatId,
      req.user.sub,
      limit ? +limit : 30,
      before ? +before : undefined,
      actId,
    );
  }

  @ApiOperation({
    summary: 'Получить все видео чата',
    description: 'Пагинация по cursor (before = ID). limit по умолчанию 30.',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Get(':chatId/media/videos')
  async getChatVideos(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.getChatVideos(
      chatId,
      req.user.sub,
      limit ? +limit : 30,
      before ? +before : undefined,
      actId,
    );
  }

  // ─── Members list ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Получить всех участников чата' })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Get(':chatId/members')
  async getChatMembers(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.getChatMembers(chatId, req.user.sub, actId);
  }

  // ─── Delete chat ───────────────────────────────────────────────────────────────

  @ApiOperation({
    summary:
      'Удалить чат (direct — убрать из своего списка; group — покинуть или удалить если создатель)',
  })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Delete(':chatId')
  async deleteChat(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.deleteChat(chatId, req.user.sub, actId);
  }

  // ─── Mute / Unmute chat ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Включить / выключить уведомления чата' })
  @ApiQuery({ name: 'act_id', required: false, type: Number, description: 'ID действия для аналитики' })
  @Patch(':chatId/mute')
  async toggleMute(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('act_id') actId?: number,
  ) {
    return this.chatService.toggleMute(chatId, req.user.sub, actId);
  }
}