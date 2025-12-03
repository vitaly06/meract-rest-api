import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { GuildService } from './guild.service';
import { SendGuildMessageDto } from './dto/send-guild-message.dto';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  guildId?: number;
}

// @WebSocketGateway - УДАЛЕНО, используется MainGateway
// @WebSocketGateway({
//   cors: {
//     origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//     credentials: true,
//   },
//   namespace: 'guild-chat',
//   path: '/socket.io/',
// })
export class GuildChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('GuildChatGateway');
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(
    private readonly guildService: GuildService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Guild Chat WebSocket Gateway initialized');
  }

  /**
   * Извлекает токен из cookies
   */
  private extractTokenFromCookies(cookieHeader: string): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Пробуем разные названия токена
    return (
      cookies['accessToken'] ||
      cookies['token'] ||
      cookies['access_token'] ||
      null
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Попытка 1: Получаем токен из auth объекта
      let token = client.handshake.auth?.token;

      // Попытка 2: Получаем токен из query параметров
      if (!token) {
        token = client.handshake.query?.token as string;
      }

      // Попытка 3: Извлекаем токен из httpOnly cookies
      if (!token) {
        const cookieHeader = client.handshake.headers.cookie;
        token = this.extractTokenFromCookies(cookieHeader);
      }

      if (!token) {
        this.logger.warn(
          `Client ${client.id} connected without token (checked auth, query, and cookies)`,
        );
        client.disconnect();
        return;
      }

      // Верифицируем JWT токен
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      client.userId = payload.sub;
      this.connectedUsers.set(client.id, client);

      this.logger.log(
        `User ${client.userId} connected to guild chat with socket ${client.id}`,
      );
    } catch (error) {
      this.logger.warn(
        `Authentication failed for client ${client.id}: ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedUsers.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected from guild chat`);
  }

  @SubscribeMessage('joinGuild')
  async handleJoinGuild(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { guildId: number },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { guildId } = data;

      // Проверяем, что пользователь является членом гильдии
      const isMember = await this.guildService.isUserMemberOfGuild(
        client.userId,
        guildId,
      );

      if (!isMember) {
        client.emit('error', { message: 'You are not a member of this guild' });
        return;
      }

      // Покидаем предыдущую комнату гильдии, если была
      if (client.guildId) {
        client.leave(`guild_${client.guildId}`);
      }

      // Присоединяемся к комнате гильдии
      client.join(`guild_${guildId}`);
      client.guildId = guildId;

      this.logger.log(`User ${client.userId} joined guild ${guildId} chat`);

      // Отправляем подтверждение
      client.emit('joinedGuild', { guildId });

      // Отправляем последние сообщения
      const messages = await this.guildService.getGuildMessages(guildId, 50, 0);
      client.emit('guildChatHistory', { messages });
    } catch (error) {
      this.logger.error(`Error joining guild: ${error.message}`);
      client.emit('error', { message: 'Failed to join guild chat' });
    }
  }

  @SubscribeMessage('leaveGuild')
  handleLeaveGuild(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.guildId) {
      client.leave(`guild_${client.guildId}`);
      this.logger.log(
        `User ${client.userId} left guild ${client.guildId} chat`,
      );
      const leftGuildId = client.guildId;
      client.guildId = undefined;
      client.emit('leftGuild', { guildId: leftGuildId });
    }
  }

  @SubscribeMessage('sendGuildMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { guildId: number; message: string },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { guildId, message } = data;

      // Проверяем, что пользователь является членом гильдии
      const isMember = await this.guildService.isUserMemberOfGuild(
        client.userId,
        guildId,
      );

      if (!isMember) {
        client.emit('messageError', {
          message: 'You are not a member of this guild',
        });
        return;
      }

      // Валидируем данные
      const dto: SendGuildMessageDto = { message };

      // Отправляем сообщение через сервис
      const newMessage = await this.guildService.sendGuildMessage(
        guildId,
        client.userId,
        dto,
      );

      // Отправляем сообщение всем пользователям в комнате гильдии
      this.server.to(`guild_${guildId}`).emit('newGuildMessage', newMessage);

      this.logger.debug(
        `Message sent to guild ${guildId} by user ${client.userId}`,
      );
    } catch (error) {
      this.logger.error(`Error sending guild message: ${error.message}`);
      client.emit('messageError', {
        message: error.message || 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('deleteGuildMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number; guildId: number },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { messageId, guildId } = data;

      // Удаляем сообщение через сервис
      await this.guildService.deleteGuildMessage(messageId, client.userId);

      // Уведомляем всех пользователей в комнате гильдии об удалении
      this.server
        .to(`guild_${guildId}`)
        .emit('guildMessageDeleted', { messageId });

      this.logger.debug(
        `Guild message ${messageId} deleted by user ${client.userId}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting guild message: ${error.message}`);
      client.emit('deleteError', {
        message: error.message || 'Failed to delete message',
      });
    }
  }

  /**
   * Отправить системное сообщение в чат гильдии
   */
  async sendSystemMessage(guildId: number, message: string) {
    const systemMessage = {
      id: 0,
      message,
      createdAt: new Date().toISOString(),
      user: {
        id: 0,
        login: 'System',
      },
      isSystem: true,
    };

    this.server.to(`guild_${guildId}`).emit('newGuildMessage', systemMessage);
    this.logger.debug(`System message sent to guild ${guildId}: ${message}`);
  }

  /**
   * Получить количество подключенных пользователей к чату гильдии
   */
  getConnectedUsersCount(guildId: number): number {
    const room = this.server.sockets.adapter.rooms.get(`guild_${guildId}`);
    return room ? room.size : 0;
  }
}
