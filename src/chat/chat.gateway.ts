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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

interface AuthSocket extends Socket {
  userId?: number;
}

export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('ChatGateway');

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit() {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token as string;
    if (auth) return auth;
    const query = client.handshake.query?.token as string;
    if (query) return query;
    const cookie = client.handshake.headers.cookie ?? '';
    const match = cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
    return match ? match[1] : null;
  }

  async handleConnection(client: AuthSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      client.userId = payload.sub;
      this.logger.log(`User ${client.userId} connected (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // ─── Join / leave a chat room ─────────────────────────────────────────────

  @SubscribeMessage('chat:join')
  handleJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { chatId: number },
  ) {
    client.join(`chat_${data.chatId}`);
    client.emit('chat:joined', { chatId: data.chatId });
  }

  @SubscribeMessage('chat:leave')
  handleLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { chatId: number },
  ) {
    client.leave(`chat_${data.chatId}`);
  }

  // ─── Send message via WebSocket ───────────────────────────────────────────

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      chatId: number;
      text?: string;
      replyToId?: number;
      forwardedFromId?: number;
    },
  ) {
    if (!client.userId) return;
    try {
      const dto: SendMessageDto = {
        text: data.text,
        replyToId: data.replyToId,
        forwardedFromId: data.forwardedFromId,
      };
      const message = await this.chatService.sendMessage(
        data.chatId,
        client.userId,
        dto,
      );
      // Broadcast to everyone in the room (including sender)
      this.server.to(`chat_${data.chatId}`).emit('chat:message', message);
    } catch (err) {
      client.emit('chat:error', { message: err.message });
    }
  }

  // ─── Mark as read ─────────────────────────────────────────────────────────

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { chatId: number },
  ) {
    if (!client.userId) return;
    await this.chatService.markAsRead(data.chatId, client.userId);
    this.server
      .to(`chat_${data.chatId}`)
      .emit('chat:read', { chatId: data.chatId, userId: client.userId });
  }

  // ─── Helper for broadcasting from other services ──────────────────────────

  broadcastMessage(chatId: number, message: any) {
    this.server.to(`chat_${chatId}`).emit('chat:message', message);
  }
}
