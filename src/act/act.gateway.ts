import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ActService } from './act.service';
import * as moment from 'moment';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'acts',
})
export class ActGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ActGateway');
  private timerInterval: NodeJS.Timeout;

  constructor(private readonly actService: ActService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.startLiveTimer();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Отправляем текущие данные о стримах новому клиенту
    this.sendActsUpdate();
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('requestActsUpdate')
  handleRequestActsUpdate(@MessageBody() data: any): void {
    this.logger.log('Client requested acts update');
    this.sendActsUpdate();
  }

  /**
   * Запускает таймер для обновления времени трансляций каждую минуту
   */
  private startLiveTimer() {
    // Обновляем каждую минуту
    this.timerInterval = setInterval(async () => {
      await this.sendActsUpdate();
    }, 60000); // 60 секунд

    this.logger.log('Live timer started - updating every minute');
  }

  /**
   * Отправляет обновление данных о стримах всем подключенным клиентам
   */
  private async sendActsUpdate() {
    try {
      const acts = await this.actService.getActs();

      // Форматируем данные специально для WebSocket
      const actsWithLiveData = acts.map((act) => ({
        id: act.id,
        name: act.name,
        startDate: act.startDate,
        liveIn: act.liveIn,
        status: act.status,
        // Добавляем дополнительную информацию для фронтенда
        isLive: this.isActLive(act.liveIn),
        timeToStart: this.getTimeToStartInMinutes(act.liveIn),
      }));

      this.server.emit('actsUpdate', {
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

  /**
   * Проверяет, идет ли трансляция в данный момент
   */
  private isActLive(liveIn: string): boolean {
    // Стрим идет если показывается время работы или "Just started"
    return (
      liveIn === 'Just started' ||
      // Проверяем различные форматы: "2h 15m", "30m", "1w 2d", "3d 5h", etc.
      /^\d+[wdhm](\s+\d+[wdhm])?$/.test(liveIn) ||
      // Исключаем строки которые начинаются с "Starts in"
      (!liveIn.startsWith('Starts in') && !liveIn.includes('Invalid'))
    );
  }

  /**
   * Извлекает количество минут до начала трансляции или времени работы
   */
  private getTimeToStartInMinutes(liveIn: string): number | null {
    // Если стрим уже идет, возвращаем null
    if (this.isActLive(liveIn)) {
      return null;
    }

    // Парсим строки типа "Starts in 2h 15m" или "Starts in 30m"
    const match = liveIn.match(/Starts in (?:(\d+)h\s*)?(\d+)m/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      return hours * 60 + minutes;
    }

    return null;
  }

  /**
   * Останавливает таймер при завершении работы
   */
  onModuleDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.logger.log('Live timer stopped');
    }
  }
}
