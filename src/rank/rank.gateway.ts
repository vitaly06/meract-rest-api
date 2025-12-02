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
  namespace: '/ranks',
  path: '/socket.io/', // ← ЭТО ОБЯЗАТЕЛЬНО!
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RankGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('RankGateway');

  afterInit(server: Server) {
    this.logger.log('Rank WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to ranks: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from ranks: ${client.id}`);
  }

  sendRankNotification(userId: number, rank: any) {
    this.server.emit(`rank:${userId}`, {
      message: 'Вы получили новый ранг!',
      rank,
      timestamp: new Date(),
    });

    this.logger.log(`Rank notification sent to user ${userId}: ${rank.name}`);
  }

  broadcastRank(userId: number, userName: string, rank: any) {
    this.server.emit('rank:global', {
      message: `${userName} получил ранг "${rank.name}"!`,
      userId,
      userName,
      rank,
      timestamp: new Date(),
    });

    this.logger.log(`Global rank notification: ${userName} got ${rank.name}`);
  }
}
