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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
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
  @Get()
  async getChats(@Req() req: RequestWithUser) {
    return this.chatService.getChats(req.user.sub);
  }

  // ─── Direct chat ─────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить или создать личный чат с пользователем',
  })
  @Post('direct/:userId')
  async getOrCreateDirectChat(
    @Req() req: RequestWithUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.chatService.getOrCreateDirectChat(req.user.sub, userId);
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
  @Post('guild/:guildId')
  async getOrCreateGuildChat(
    @Req() req: RequestWithUser,
    @Param('guildId', ParseIntPipe) guildId: number,
  ) {
    return this.chatService.getOrCreateGuildChat(req.user.sub, guildId);
  }

  // ─── Messages ────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить сообщения чата (пагинация курсором)',
    description:
      'limit по умолчанию 50. before — ID сообщения для загрузки более старых.',
  })
  @Get(':chatId/messages')
  async getMessages(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getMessages(
      chatId,
      req.user.sub,
      limit ? +limit : 50,
      before ? +before : undefined,
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
  @Delete('messages/:messageId')
  async deleteMessage(
    @Req() req: RequestWithUser,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    return this.chatService.deleteMessage(messageId, req.user.sub);
  }

  // ─── Add member ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Добавить участника в групповой чат' })
  @Post(':chatId/members/:userId')
  async addMember(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    return this.chatService.addMember(chatId, req.user.sub, targetUserId);
  }

  // ─── Mark as read ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Отметить чат как прочитанный' })
  @Patch(':chatId/read')
  async markAsRead(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
  ) {
    return this.chatService.markAsRead(chatId, req.user.sub);
  }

  // ─── Invite link ──────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить или создать ссылку-приглашение для чата',
    description: 'Доступно только для групповых и гильдийных чатов.',
  })
  @Get(':chatId/invite')
  async getInviteCode(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
  ) {
    return this.chatService.generateInviteCode(chatId, req.user.sub);
  }

  @ApiOperation({
    summary: 'Вступить в чат по коду приглашения',
    description:
      'Пользователь присоединяется к групповому/гильдийному чату по invite-коду.',
  })
  @Post('join/:code')
  async joinByInviteCode(
    @Req() req: RequestWithUser,
    @Param('code') code: string,
  ) {
    return this.chatService.joinByInviteCode(code, req.user.sub);
  }

  // ─── Media queries ────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Получить все изображения чата',
    description: 'Пагинация по cursor (before = ID). limit по умолчанию 30.',
  })
  @Get(':chatId/media/images')
  async getChatImages(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getChatImages(
      chatId,
      req.user.sub,
      limit ? +limit : 30,
      before ? +before : undefined,
    );
  }

  @ApiOperation({
    summary: 'Получить все видео чата',
    description: 'Пагинация по cursor (before = ID). limit по умолчанию 30.',
  })
  @Get(':chatId/media/videos')
  async getChatVideos(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getChatVideos(
      chatId,
      req.user.sub,
      limit ? +limit : 30,
      before ? +before : undefined,
    );
  }

  // ─── Members list ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Получить всех участников чата' })
  @Get(':chatId/members')
  async getChatMembers(
    @Req() req: RequestWithUser,
    @Param('chatId', ParseIntPipe) chatId: number,
  ) {
    return this.chatService.getChatMembers(chatId, req.user.sub);
  }
}
