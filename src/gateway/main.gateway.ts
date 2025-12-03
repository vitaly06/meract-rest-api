import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat/chat.service';
import { GuildService } from '../guild/guild.service';
import { ActService } from '../act/act.service';
import { CreateMessageDto } from '../chat/dto/create-message.dto';
import { SendGuildMessageDto } from '../guild/dto/send-guild-message.dto';
import moment from 'moment';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  actId?: number;
  guildId?: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  path: '/socket.io/',
})
export class MainGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('MainGateway');
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private timerInterval: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly guildService: GuildService,
    private readonly actService: ActService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Main WebSocket Gateway initialized (single server)');

    // Создаем все namespace вручную
    const chatNs = server.of('/chat');
    const guildNs = server.of('/guild-chat');
    const rankNs = server.of('/ranks');
    const achievementNs = server.of('/achievements');
    const actNs = server.of('/acts');

    // Настраиваем логику для каждого namespace
    this.setupChatNamespace(chatNs);
    this.setupGuildNamespace(guildNs);
    this.setupRankNamespace(rankNs);
    this.setupAchievementNamespace(achievementNs);
    this.setupActNamespace(actNs);

    // Запускаем таймер для Acts
    this.startLiveTimer();

    this.logger.log(
      'All namespaces initialized: /chat, /guild-chat, /ranks, /achievements, /acts',
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to root: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from root: ${client.id}`);
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

    return (
      cookies['accessToken'] ||
      cookies['token'] ||
      cookies['access_token'] ||
      null
    );
  }

  /**
   * Аутентификация клиента через JWT
   */
  private async authenticateSocket(
    client: AuthenticatedSocket,
  ): Promise<boolean> {
    try {
      let token = client.handshake.auth?.token;

      if (!token) {
        token = client.handshake.query?.token as string;
      }

      if (!token) {
        const cookieHeader = client.handshake.headers.cookie;
        token = this.extractTokenFromCookies(cookieHeader);
      }

      if (!token) {
        this.logger.warn(
          `Client ${client.id} connected without token (checked auth, query, and cookies)`,
        );
        return false;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      client.userId = payload.sub;
      return true;
    } catch (error) {
      this.logger.warn(
        `Authentication failed for client ${client.id}: ${error.message}`,
      );
      return false;
    }
  }

  // ============================================
  // CHAT NAMESPACE (/chat)
  // ============================================
  private setupChatNamespace(ns: any) {
    ns.on('connection', async (socket: AuthenticatedSocket) => {
      const isAuthenticated = await this.authenticateSocket(socket);
      if (!isAuthenticated) {
        socket.disconnect();
        return;
      }

      this.connectedUsers.set(socket.id, socket);
      this.logger.log(
        `User ${socket.userId} connected to /chat (${socket.id})`,
      );

      // joinStream
      socket.on('joinStream', async (data: { actId: number }) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { actId } = data;

          if (socket.actId) {
            socket.leave(`stream_${socket.actId}`);
          }

          socket.join(`stream_${actId}`);
          socket.actId = actId;

          this.logger.log(`User ${socket.userId} joined stream ${actId} chat`);

          socket.emit('joinedStream', { actId });

          const messages = await this.chatService.getMessages(actId, 50, 0);
          socket.emit('chatHistory', { messages });
        } catch (error) {
          this.logger.error(`Error joining stream: ${error.message}`);
          socket.emit('error', { message: 'Failed to join stream chat' });
        }
      });

      // leaveStream
      socket.on('leaveStream', () => {
        if (socket.actId) {
          socket.leave(`stream_${socket.actId}`);
          this.logger.log(
            `User ${socket.userId} left stream ${socket.actId} chat`,
          );
          socket.actId = undefined;
          socket.emit('leftStream');
        }
      });

      // sendMessage
      socket.on(
        'sendMessage',
        async (data: { actId: number; message?: string; content?: string }) => {
          try {
            if (!socket.userId) {
              socket.emit('error', { message: 'Not authenticated' });
              return;
            }

            const { actId, message, content } = data;
            const messageText = message || content;

            if (!messageText) {
              socket.emit('messageError', {
                message: 'Message text is required',
              });
              return;
            }

            if (socket.actId !== actId) {
              socket.join(`stream_${actId}`);
              socket.actId = actId;
              this.logger.debug(
                `User ${socket.userId} auto-joined stream ${actId} chat`,
              );
            }

            const dto: CreateMessageDto = { message: messageText };
            const newMessage = await this.chatService.sendMessage(
              actId,
              socket.userId,
              dto,
            );

            ns.to(`stream_${actId}`).emit('newMessage', newMessage);

            this.logger.debug(
              `Message sent to stream ${actId} by user ${socket.userId}`,
            );
          } catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            socket.emit('messageError', {
              message: error.message || 'Failed to send message',
            });
          }
        },
      );

      // deleteMessage
      socket.on(
        'deleteMessage',
        async (data: { messageId: number; actId: number }) => {
          try {
            if (!socket.userId) {
              socket.emit('error', { message: 'Not authenticated' });
              return;
            }

            const { messageId, actId } = data;

            await this.chatService.deleteMessage(messageId, socket.userId);

            ns.to(`stream_${actId}`).emit('messageDeleted', { messageId });

            this.logger.debug(
              `Message ${messageId} deleted by user ${socket.userId}`,
            );
          } catch (error) {
            this.logger.error(`Error deleting message: ${error.message}`);
            socket.emit('deleteError', {
              message: error.message || 'Failed to delete message',
            });
          }
        },
      );

      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id);
        this.logger.log(`Client ${socket.id} disconnected from /chat`);
      });
    });
  }

  // ============================================
  // GUILD CHAT NAMESPACE (/guild-chat)
  // ============================================
  private setupGuildNamespace(ns: any) {
    ns.on('connection', async (socket: AuthenticatedSocket) => {
      const isAuthenticated = await this.authenticateSocket(socket);
      if (!isAuthenticated) {
        socket.disconnect();
        return;
      }

      this.connectedUsers.set(socket.id, socket);
      this.logger.log(
        `User ${socket.userId} connected to /guild-chat (${socket.id})`,
      );

      // joinGuild
      socket.on('joinGuild', async (data: { guildId: number }) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { guildId } = data;

          const isMember = await this.guildService.isUserMemberOfGuild(
            socket.userId,
            guildId,
          );

          if (!isMember) {
            socket.emit('error', {
              message: 'You are not a member of this guild',
            });
            return;
          }

          if (socket.guildId) {
            socket.leave(`guild_${socket.guildId}`);
          }

          socket.join(`guild_${guildId}`);
          socket.guildId = guildId;

          this.logger.log(`User ${socket.userId} joined guild ${guildId} chat`);

          socket.emit('joinedGuild', { guildId });

          const messages = await this.guildService.getGuildMessages(
            guildId,
            50,
            0,
          );
          socket.emit('guildChatHistory', { messages });
        } catch (error) {
          this.logger.error(`Error joining guild: ${error.message}`);
          socket.emit('error', { message: 'Failed to join guild chat' });
        }
      });

      // leaveGuild
      socket.on('leaveGuild', () => {
        if (socket.guildId) {
          socket.leave(`guild_${socket.guildId}`);
          this.logger.log(
            `User ${socket.userId} left guild ${socket.guildId} chat`,
          );
          const leftGuildId = socket.guildId;
          socket.guildId = undefined;
          socket.emit('leftGuild', { guildId: leftGuildId });
        }
      });

      // sendGuildMessage
      socket.on(
        'sendGuildMessage',
        async (data: { guildId: number; message: string }) => {
          try {
            if (!socket.userId) {
              socket.emit('error', { message: 'Not authenticated' });
              return;
            }

            const { guildId, message } = data;

            const isMember = await this.guildService.isUserMemberOfGuild(
              socket.userId,
              guildId,
            );

            if (!isMember) {
              socket.emit('messageError', {
                message: 'You are not a member of this guild',
              });
              return;
            }

            const dto: SendGuildMessageDto = { message };

            const newMessage = await this.guildService.sendGuildMessage(
              guildId,
              socket.userId,
              dto,
            );

            ns.to(`guild_${guildId}`).emit('newGuildMessage', newMessage);

            this.logger.debug(
              `Message sent to guild ${guildId} by user ${socket.userId}`,
            );
          } catch (error) {
            this.logger.error(`Error sending guild message: ${error.message}`);
            socket.emit('messageError', {
              message: error.message || 'Failed to send message',
            });
          }
        },
      );

      // deleteGuildMessage
      socket.on(
        'deleteGuildMessage',
        async (data: { messageId: number; guildId: number }) => {
          try {
            if (!socket.userId) {
              socket.emit('error', { message: 'Not authenticated' });
              return;
            }

            const { messageId, guildId } = data;

            await this.guildService.deleteGuildMessage(
              messageId,
              socket.userId,
            );

            ns.to(`guild_${guildId}`).emit('guildMessageDeleted', {
              messageId,
            });

            this.logger.debug(
              `Guild message ${messageId} deleted by user ${socket.userId}`,
            );
          } catch (error) {
            this.logger.error(`Error deleting guild message: ${error.message}`);
            socket.emit('deleteError', {
              message: error.message || 'Failed to delete message',
            });
          }
        },
      );

      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id);
        this.logger.log(`Client ${socket.id} disconnected from /guild-chat`);
      });
    });
  }

  // ============================================
  // RANK NAMESPACE (/ranks)
  // ============================================
  private setupRankNamespace(ns: any) {
    ns.on('connection', (socket: Socket) => {
      this.logger.log(`Client connected to /ranks: ${socket.id}`);

      socket.on('disconnect', () => {
        this.logger.log(`Client disconnected from /ranks: ${socket.id}`);
      });
    });
  }

  // Публичные методы для отправки уведомлений о рангах
  sendRankNotification(userId: number, rank: any) {
    const rankNs = this.server.of('/ranks');
    rankNs.emit(`rank:${userId}`, {
      message: 'Вы получили новый ранг!',
      rank,
      timestamp: new Date(),
    });

    this.logger.log(`Rank notification sent to user ${userId}: ${rank.name}`);
  }

  broadcastRank(userId: number, userName: string, rank: any) {
    const rankNs = this.server.of('/ranks');
    rankNs.emit('rank:global', {
      message: `${userName} получил ранг "${rank.name}"!`,
      userId,
      userName,
      rank,
      timestamp: new Date(),
    });

    this.logger.log(`Global rank notification: ${userName} got ${rank.name}`);
  }

  // ============================================
  // ACHIEVEMENT NAMESPACE (/achievements)
  // ============================================
  private setupAchievementNamespace(ns: any) {
    ns.on('connection', (socket: Socket) => {
      this.logger.log(`Client connected to /achievements: ${socket.id}`);

      socket.on('disconnect', () => {
        this.logger.log(`Client disconnected from /achievements: ${socket.id}`);
      });
    });
  }

  // Публичные методы для отправки уведомлений о достижениях
  sendAchievementNotification(userId: number, achievement: any) {
    const achievementNs = this.server.of('/achievements');
    achievementNs.emit(`achievement:${userId}`, {
      message: 'Вы получили новое достижение!',
      achievement,
      timestamp: new Date(),
    });

    this.logger.log(
      `Achievement notification sent to user ${userId}: ${achievement.name}`,
    );
  }

  broadcastAchievement(userId: number, userName: string, achievement: any) {
    const achievementNs = this.server.of('/achievements');
    achievementNs.emit('achievement:global', {
      message: `${userName} получил достижение "${achievement.name}"!`,
      userId,
      userName,
      achievement,
      timestamp: new Date(),
    });

    this.logger.log(
      `Global achievement notification: ${userName} got ${achievement.name}`,
    );
  }

  // ============================================
  // ACT NAMESPACE (/acts)
  // ============================================
  private setupActNamespace(ns: any) {
    ns.on('connection', (socket: Socket) => {
      this.logger.log(`Client connected to /acts: ${socket.id}`);
      this.sendActsUpdate();

      socket.on('requestActsUpdate', () => {
        this.logger.log('Client requested acts update');
        this.sendActsUpdate();
      });

      socket.on('disconnect', () => {
        this.logger.log(`Client disconnected from /acts: ${socket.id}`);
      });
    });
  }

  private startLiveTimer() {
    this.timerInterval = setInterval(async () => {
      await this.sendActsUpdate();
    }, 60000);

    this.logger.log('Live timer started - updating every minute');
  }

  private async sendActsUpdate() {
    try {
      const acts = await this.actService.getActs();

      const actsWithLiveData = acts.map((act) => ({
        id: act.id,
        name: act.name,
        startDate: act.startDate,
        liveIn: act.liveIn,
        status: act.status,
        isLive: this.isActLive(act.liveIn),
        timeToStart: this.getTimeToStartInMinutes(act.liveIn),
      }));

      const actNs = this.server.of('/acts');
      actNs.emit('actsUpdate', {
        acts: actsWithLiveData,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Sent acts update to clients: ${actsWithLiveData.length} acts`,
      );
    } catch (error) {
      this.logger.error('Error sending acts update:', error);
    }
  }

  private isActLive(liveIn: string): boolean {
    return (
      liveIn === 'Just started' ||
      /^\d+[wdhm](\s+\d+[wdhm])?$/.test(liveIn) ||
      (!liveIn.startsWith('Starts in') && !liveIn.includes('Invalid'))
    );
  }

  private getTimeToStartInMinutes(liveIn: string): number | null {
    if (this.isActLive(liveIn)) {
      return null;
    }

    const match = liveIn.match(/Starts in (?:(\d+)h\s*)?(\d+)m/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      return hours * 60 + minutes;
    }

    return null;
  }

  // ============================================
  // ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ CHAT
  // ============================================
  async sendSystemMessage(actId: number, message: string) {
    const chatNs = this.server.of('/chat');
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

    chatNs.to(`stream_${actId}`).emit('newMessage', systemMessage);
    this.logger.debug(`System message sent to stream ${actId}: ${message}`);
  }

  getConnectedUsersCount(actId: number): number {
    const chatNs = this.server.of('/chat');
    const room = chatNs.adapter.rooms.get(`stream_${actId}`);
    return room ? room.size : 0;
  }

  // ============================================
  // ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ GUILD CHAT
  // ============================================
  async sendGuildSystemMessage(guildId: number, message: string) {
    const guildNs = this.server.of('/guild-chat');
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

    guildNs.to(`guild_${guildId}`).emit('newGuildMessage', systemMessage);
    this.logger.debug(`System message sent to guild ${guildId}: ${message}`);
  }

  getConnectedGuildUsersCount(guildId: number): number {
    const guildNs = this.server.of('/guild-chat');
    const room = guildNs.adapter.rooms.get(`guild_${guildId}`);
    return room ? room.size : 0;
  }

  onModuleDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.logger.log('Live timer stopped');
    }
  }
}
