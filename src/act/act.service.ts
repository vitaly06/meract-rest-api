import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import moment from 'moment';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import { CreateActRequest } from './dto/create-act.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ActService {
  private readonly baseUrl: string;
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
  }

  async createAct(dto: CreateActRequest, userId: number, filename?: string) {
    const {
      title,
      sequelId,
      introId,
      type,
      format,
      heroMethods,
      navigatorMethods,
      biddingTime,
    } = { ...dto };

    // Проверка существования пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: +userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    try {
      const newStream = await this.prisma.act.create({
        data: {
          title,
          sequelId: +sequelId,
          introId: +introId,
          format,
          heroMethods,
          navigatorMethods,
          biddingTime,
          userId: +userId,
          previewFileName: `/uploads/acts/${filename}` || null,
          status: 'ONLINE', // Устанавливаем статус по умолчанию
          startedAt: new Date(),
        },
        include: {
          user: true,
          category: true,
        },
      });

      await this.utilsService.addRecordToActivityJournal(
        `User ${user.login || user.email} started stream: '${newStream.title}'`,
        [+userId],
      );

      return { message: 'Stream launched successfully', actId: newStream.id };
    } catch (error) {
      console.error(`Error creating act: ${error.message}`);
      throw new NotFoundException(`Failed to create act: ${error.message}`);
    }
  }

  async getActs() {
    const streams = await this.prisma.act.findMany({
      include: {
        user: true,
        category: true,
      },
    });

    if (!streams || streams.length === 0) {
      return [];
    }

    const result = streams.map((stream) => ({
      id: stream.id,
      name: stream.title || '',
      previewFileName: `${this.baseUrl}${stream.previewFileName}`,
      user: stream.user.login || stream.user.email,
      category: stream.category?.name || '',
      categoryId: stream.category?.id,
      status: stream.status || '',
      spectators: 'Not implemented', // Замените, если есть реализация
      duration: this.formatTimeDifference(
        stream.startedAt,
        stream.endedAt || new Date(),
      ),
      // Дата старта в формате "21 Jan. 15:30"
      startDate: this.formatStartDate(stream.startedAt),
      // Время до начала трансляции в формате "Live in 2h 15m"
      liveIn: this.formatLiveIn(stream.startedAt),
    }));

    return result.sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  async stopAct(id: number, req: RequestWithUser) {
    const currentStream = await this.prisma.act.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!currentStream) {
      throw new NotFoundException(`Act with ID ${id} not found`);
    }

    // Проверка прав доступа (например, только админ или владелец может остановить стрим)
    const currentAdmin = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    if (
      !currentAdmin ||
      (currentAdmin.id !== currentStream.userId &&
        !['admin', 'main admin'].includes(currentAdmin.role?.name))
    ) {
      throw new ForbiddenException('You are not authorized to stop this act');
    }

    try {
      await this.prisma.act.delete({
        where: { id },
      });

      if (currentAdmin.id !== currentStream.userId) {
        // Увеличиваем счётчик остановок для админа
        await this.prisma.user.update({
          where: { id: req.user.sub },
          data: {
            terminateCount: {
              increment: 1,
            },
          },
        });

        await this.utilsService.addRecordToActivityJournal(
          `Admin ${currentAdmin.login || currentAdmin.email} stopped stream '${currentStream.title}' of user ${currentStream.user.login || currentStream.user.email}`,
          [currentAdmin.id, currentStream.user.id],
        );
      }

      return { message: 'Stream successfully stopped' };
    } catch (error) {
      console.error(`Error stopping act ${id}: ${error.message}`);
      throw new NotFoundException(`Failed to stop act: ${error.message}`);
    }
  }

  async getStatistic() {
    try {
      // Количество активных стримов
      const activeStreams = await this.prisma.act.count({
        where: {
          status: 'ONLINE',
        },
      });

      // Стримы, остановленные админами
      const admins = await this.prisma.user.findMany({
        where: {
          role: {
            name: { in: ['admin', 'main admin'] },
          },
          terminateCount: {
            not: null,
          },
        },
        include: {
          role: true,
        },
      });

      const adminBlocked = admins.reduce(
        (sum, elem) => sum + (elem.terminateCount || 0),
        0,
      );

      return {
        activeStreams,
        allSpectators: 'Not implemented', // Замените, если есть реализация
        adminBlocked,
      };
    } catch (error) {
      console.error(`Error fetching statistics: ${error.message}`);
      throw new NotFoundException(
        `Failed to fetch statistics: ${error.message}`,
      );
    }
  }

  generateToken(
    channel: string,
    roleStr: string,
    tokenType: string,
    uidStr: string,
    expiry: number,
  ): string {
    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appID || !appCertificate) {
      throw new Error(
        'AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in .env',
      );
    }

    const uid = parseInt(uidStr, 10) || 0;
    const role =
      roleStr.toUpperCase() === 'PUBLISHER'
        ? RtcRole.PUBLISHER
        : RtcRole.SUBSCRIBER;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expiry;

    try {
      if (tokenType === 'uid') {
        return RtcTokenBuilder.buildTokenWithUid(
          appID,
          appCertificate,
          channel,
          uid,
          role,
          privilegeExpiredTs,
        );
      } else if (tokenType === 'userAccount') {
        return RtcTokenBuilder.buildTokenWithAccount(
          appID,
          appCertificate,
          channel,
          uid.toString(),
          role,
          privilegeExpiredTs,
        );
      } else {
        throw new Error('Invalid tokenType');
      }
    } catch (error) {
      console.error(`Error generating Agora token: ${error.message}`);
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }

  private formatTimeDifference(
    start: Date | string,
    end: Date | string,
  ): string {
    const startStr = start instanceof Date ? start.toISOString() : start;
    const endStr = end instanceof Date ? end.toISOString() : end;

    const startMoment = moment(startStr, moment.ISO_8601);
    const endMoment = moment(endStr, moment.ISO_8601);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return '00:00:00';
    }

    const duration = moment.duration(endMoment.diff(startMoment));
    return [
      duration.hours().toString().padStart(2, '0'),
      duration.minutes().toString().padStart(2, '0'),
      duration.seconds().toString().padStart(2, '0'),
    ].join(':');
  }

  /**
   * Форматирует дату старта трансляции в формат "21 Jan. 15:30"
   * @param startedAt дата начала стрима
   * @returns отформатированная дата
   */
  private formatStartDate(startedAt: Date | string): string {
    try {
      // Если передана дата как объект Date, используем её напрямую
      if (startedAt instanceof Date) {
        return moment(startedAt).format('D MMM. HH:mm');
      }

      // Если строка пустая или некорректная
      if (!startedAt || startedAt === 'string' || startedAt.length < 8) {
        return moment().format('D MMM. HH:mm');
      }

      // Пробуем различные форматы парсинга для строки
      let date = moment(startedAt, moment.ISO_8601, true);

      if (!date.isValid()) {
        date = moment(startedAt);
      }

      if (!date.isValid()) {
        const formats = [
          'YYYY-MM-DD HH:mm:ss',
          'YYYY-MM-DDTHH:mm:ss',
          'DD/MM/YYYY HH:mm',
          'MM/DD/YYYY HH:mm',
          'YYYY-MM-DD',
        ];

        for (const format of formats) {
          date = moment(startedAt, format, true);
          if (date.isValid()) break;
        }
      }

      if (!date.isValid()) {
        console.warn('Could not parse startedAt:', startedAt);
        return moment().format('D MMM. HH:mm');
      }

      // Формат: "21 Jan. 15:30"
      return date.format('D MMM. HH:mm');
    } catch (error) {
      console.error('Error formatting start date:', error);
      return moment().format('D MMM. HH:mm');
    }
  }

  /**
   * Форматирует время до начала трансляции в формат "Live in 2h 15m"
   * @param startedAt дата начала стрима
   * @returns отформатированное время
   */
  private formatLiveIn(startedAt: Date | string): string {
    try {
      let streamStartTime: moment.Moment;

      // Если передана дата как объект Date, используем её напрямую
      if (startedAt instanceof Date) {
        streamStartTime = moment(startedAt);
      } else {
        // Если строка пустая или некорректная
        if (!startedAt || startedAt === 'string' || startedAt.length < 8) {
          return 'Just started';
        }

        // Пробуем различные форматы парсинга для строки
        streamStartTime = moment(startedAt, moment.ISO_8601, true);

        if (!streamStartTime.isValid()) {
          streamStartTime = moment(startedAt);
        }

        if (!streamStartTime.isValid()) {
          const formats = [
            'YYYY-MM-DD HH:mm:ss',
            'YYYY-MM-DDTHH:mm:ss',
            'DD/MM/YYYY HH:mm',
            'MM/DD/YYYY HH:mm',
            'YYYY-MM-DD',
          ];

          for (const format of formats) {
            streamStartTime = moment(startedAt, format, true);
            if (streamStartTime.isValid()) break;
          }
        }

        if (!streamStartTime.isValid()) {
          console.warn('Could not parse startedAt for liveIn:', startedAt);
          return 'Just started';
        }
      }

      const now = moment();
      const diff = now.diff(streamStartTime);

      // Если стрим уже начался, показываем сколько времени он идет
      if (diff >= 0) {
        return this.formatDuration(diff);
      }

      // Если время ещё не пришло (что маловероятно для startedAt)
      return `Starts in ${this.formatDuration(-diff)}`;
    } catch (error) {
      console.error('Error formatting liveIn:', error);
      return 'Just started';
    }
  }

  /**
   * Форматирует продолжительность в читаемый формат с неделями, днями, часами и минутами
   * @param milliseconds продолжительность в миллисекундах
   * @returns отформатированная строка
   */
  private formatDuration(milliseconds: number): string {
    const duration = moment.duration(Math.abs(milliseconds));

    const weeks = Math.floor(duration.asDays() / 7);
    const days = Math.floor(duration.asDays()) % 7;
    const hours = duration.hours();
    const minutes = duration.minutes();

    const parts: string[] = [];

    if (weeks > 0) {
      parts.push(`${weeks}w`);
    }

    if (days > 0) {
      parts.push(`${days}d`);
    }

    if (hours > 0) {
      parts.push(`${hours}h`);
    }

    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }

    // Если ничего нет, значит только что начался
    if (parts.length === 0) {
      return 'Just started';
    }

    // Показываем максимум 2 единицы времени для краткости
    return parts.slice(0, 2).join(' ');
  }
}
