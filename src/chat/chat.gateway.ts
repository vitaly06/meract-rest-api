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
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  actId?: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized');
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
        `User ${client.userId} connected with socket ${client.id}`,
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
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('joinStream')
  async handleJoinStream(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { actId: number },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { actId } = data;

      // Покидаем предыдущую комнату, если была
      if (client.actId) {
        client.leave(`stream_${client.actId}`);
      }

      // Присоединяемся к комнате стрима
      client.join(`stream_${actId}`);
      client.actId = actId;

      this.logger.log(`User ${client.userId} joined stream ${actId} chat`);

      // Отправляем подтверждение
      client.emit('joinedStream', { actId });

      // Отправляем последние сообщения
      const messages = await this.chatService.getMessages(actId, 50, 0);
      client.emit('chatHistory', { messages });
    } catch (error) {
      this.logger.error(`Error joining stream: ${error.message}`);
      client.emit('error', { message: 'Failed to join stream chat' });
    }
  }

  @SubscribeMessage('leaveStream')
  handleLeaveStream(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.actId) {
      client.leave(`stream_${client.actId}`);
      this.logger.log(`User ${client.userId} left stream ${client.actId} chat`);
      client.actId = undefined;
      client.emit('leftStream');
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { actId: number; message?: string; content?: string },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { actId, message, content } = data;
      const messageText = message || content; // Поддержка обоих полей

      if (!messageText) {
        client.emit('messageError', { message: 'Message text is required' });
        return;
      }

      // Автоматически присоединяем к комнате, если еще не в ней
      if (client.actId !== actId) {
        client.join(`stream_${actId}`);
        client.actId = actId;
        this.logger.debug(
          `User ${client.userId} auto-joined stream ${actId} chat`,
        );
      }

      // Валидируем данные
      const dto: CreateMessageDto = { message: messageText };

      // Отправляем сообщение через сервис
      const newMessage = await this.chatService.sendMessage(
        actId,
        client.userId,
        dto,
      );

      // Отправляем сообщение всем пользователям в комнате стрима
      this.server.to(`stream_${actId}`).emit('newMessage', newMessage);

      this.logger.debug(
        `Message sent to stream ${actId} by user ${client.userId}`,
      );
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('messageError', {
        message: error.message || 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number; actId: number },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { messageId, actId } = data;

      // Удаляем сообщение через сервис
      await this.chatService.deleteMessage(messageId, client.userId);

      // Уведомляем всех пользователей в комнате стрима об удалении
      this.server.to(`stream_${actId}`).emit('messageDeleted', { messageId });

      this.logger.debug(
        `Message ${messageId} deleted by user ${client.userId}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`);
      client.emit('deleteError', {
        message: error.message || 'Failed to delete message',
      });
    }
  }

  /**
   * Отправить системное сообщение в чат стрима (например, о начале/окончании стрима)
   */
  async sendSystemMessage(actId: number, message: string) {
    const systemMessage = {
      id: 0,
      message,
      createdAt: new Date().toISOString(),
      user: {
        id: 0,
        username: 'System',
        status: 'SYSTEM',
      },
      isSystem: true,
    };

    this.server.to(`stream_${actId}`).emit('newMessage', systemMessage);
    this.logger.debug(`System message sent to stream ${actId}: ${message}`);
  }

  /**
   * Получить количество подключенных пользователей к чату стрима
   */
  getConnectedUsersCount(actId: number): number {
    const room = this.server.sockets.adapter.rooms.get(`stream_${actId}`);
    return room ? room.size : 0;
  }
}
