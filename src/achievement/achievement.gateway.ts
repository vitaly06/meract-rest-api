import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/achievements',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class AchievementGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('AchievementGateway');

  afterInit(server: Server) {
    this.logger.log('Achievement WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to achievements: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from achievements: ${client.id}`);
  }

  sendAchievementNotification(userId: number, achievement: any) {
    this.server.emit(`achievement:${userId}`, {
      message: 'Вы получили новое достижение!',
      achievement,
      timestamp: new Date(),
    });

    this.logger.log(
      `Achievement notification sent to user ${userId}: ${achievement.name}`,
    );
  }

  broadcastAchievement(userId: number, userName: string, achievement: any) {
    this.server.emit('achievement:global', {
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
}
