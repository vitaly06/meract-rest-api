import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import moment from 'moment';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import { CreateActRequest } from './dto/create-act.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';
import { ConfigService } from '@nestjs/config';
import { AgoraRecordingService } from 'src/agora-recording/agora-recording.service';
import { SelectionMethods } from '@prisma/client';

@Injectable()
export class ActService {
  private readonly baseUrl: string;
  private readonly logger = new Logger(ActService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    private readonly agoraRecordingService: AgoraRecordingService,
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
      outroId,
      musicIds,
      type,
      format,
      heroMethods,
      navigatorMethods,
      spotAgentMethods,
      spotAgentCount,
      biddingTime,
      tasks,
    } = { ...dto };

    // Проверка существования пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: +userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Проверка существования sequel если указан
    if (sequelId) {
      const sequel = await this.prisma.sequel.findUnique({
        where: { id: +sequelId },
      });
      if (!sequel) {
        throw new NotFoundException(`Sequel with ID ${sequelId} not found`);
      }
    }

    // Проверка существования intro
    const intro = await this.prisma.intro.findUnique({
      where: { id: +introId },
    });
    if (!intro) {
      throw new NotFoundException(`Intro with ID ${introId} not found`);
    }

    // Проверка существования outro
    const outro = await this.prisma.outro.findUnique({
      where: { id: +outroId },
    });
    if (!outro) {
      throw new NotFoundException(`Outro with ID ${outroId} not found`);
    }

    // Проверка существования effect (опционально)
    if (dto.effectId) {
      const effect = await this.prisma.effect.findUnique({
        where: { id: +dto.effectId },
      });
      if (!effect) {
        throw new NotFoundException(`Effect with ID ${dto.effectId} not found`);
      }
    }

    // Проверка и нормализация musicIds
    let normalizedMusicIds: number[] = [];
    if (Array.isArray(musicIds)) {
      normalizedMusicIds = musicIds;
    } else if (musicIds) {
      const musicIdsAny = musicIds as any;
      if (typeof musicIdsAny === 'string') {
        try {
          const parsed = JSON.parse(musicIdsAny);
          normalizedMusicIds = Array.isArray(parsed)
            ? parsed
            : [Number(musicIdsAny)];
        } catch {
          normalizedMusicIds = musicIdsAny
            .split(',')
            .map((id: string) => Number(id.trim()));
        }
      } else {
        normalizedMusicIds = [Number(musicIdsAny)];
      }
    }

    // Нормализация tasks
    let normalizedTasks = tasks;
    if (tasks && !Array.isArray(tasks)) {
      if (typeof tasks === 'string') {
        try {
          const parsed = JSON.parse(tasks);
          normalizedTasks = Array.isArray(parsed) ? parsed : undefined;
        } catch {
          normalizedTasks = undefined;
        }
      } else {
        normalizedTasks = undefined;
      }
    }

    // Нормализация routePoints
    let normalizedRoutePoints = dto.routePoints;
    if (dto.routePoints && !Array.isArray(dto.routePoints)) {
      if (typeof dto.routePoints === 'string') {
        try {
          const parsed = JSON.parse(dto.routePoints as any);
          normalizedRoutePoints = Array.isArray(parsed) ? parsed : undefined;
        } catch {
          normalizedRoutePoints = undefined;
        }
      } else {
        normalizedRoutePoints = undefined;
      }
    }

    // Если передан массив routePoints, НЕ добавляем старые координаты
    // Если НЕ передан - создаем из старых координат
    const shouldUseOldCoordinates =
      (!normalizedRoutePoints || normalizedRoutePoints.length === 0) &&
      dto.startLatitude &&
      dto.startLongitude &&
      dto.destinationLatitude &&
      dto.destinationLongitude;

    // Логирование для отладки
    this.logger.log(
      `Creating act with route strategy: ${normalizedRoutePoints && normalizedRoutePoints.length > 0 ? `routePoints (${normalizedRoutePoints.length} points)` : shouldUseOldCoordinates ? 'old coordinates' : 'no route'}`,
    );
    if (normalizedRoutePoints && normalizedRoutePoints.length > 0) {
      this.logger.debug(
        `Route points: ${JSON.stringify(normalizedRoutePoints)}`,
      );
      this.logger.debug(
        `Old coordinates ignored: start(${dto.startLatitude}, ${dto.startLongitude}), dest(${dto.destinationLatitude}, ${dto.destinationLongitude})`,
      );
    }

    try {
      const newStream = await this.prisma.act.create({
        data: {
          title,
          sequelId: +dto.sequelId || null,
          introId: +introId,
          outroId: +outroId,
          effectId: dto.effectId ? +dto.effectId : null,
          format,
          heroMethods,
          navigatorMethods,
          spotAgentMethods,
          spotAgentCount: +spotAgentCount || 0,
          biddingTime,
          userId: +userId,
          previewFileName: `/uploads/acts/${filename}` || null,
          status: 'ONLINE',
          startedAt: new Date(),
          // Старые поля координат (для обратной совместимости)
          startLatitude: dto.startLatitude ? +dto.startLatitude : null,
          startLongitude: dto.startLongitude ? +dto.startLongitude : null,
          destinationLatitude: dto.destinationLatitude
            ? +dto.destinationLatitude
            : null,
          destinationLongitude: dto.destinationLongitude
            ? +dto.destinationLongitude
            : null,
          musics: {
            create: normalizedMusicIds.map((musicId, index) => ({
              musicId: +musicId,
              order: index,
            })),
          },
          tasks: normalizedTasks
            ? {
                create: normalizedTasks.map((task) => ({
                  title: task.title,
                  isCompleted: false,
                })),
              }
            : undefined,
          // Точки маршрута
          routePoints:
            normalizedRoutePoints && normalizedRoutePoints.length > 0
              ? {
                  create: normalizedRoutePoints.map((point, index) => ({
                    latitude: +point.latitude,
                    longitude: +point.longitude,
                    order: index,
                  })),
                }
              : // Если routePoints не передан, но есть старые координаты - создаем из них
                shouldUseOldCoordinates
                ? {
                    create: [
                      {
                        latitude: +dto.startLatitude,
                        longitude: +dto.startLongitude,
                        order: 0,
                      },
                      {
                        latitude: +dto.destinationLatitude,
                        longitude: +dto.destinationLongitude,
                        order: 1,
                      },
                    ],
                  }
                : undefined,
        },
        include: {
          user: true,
          category: true,
          routePoints: {
            orderBy: { order: 'asc' },
          },
        },
      });

      await this.utilsService.addRecordToActivityJournal(
        `User ${user.login || user.email} started stream: '${newStream.title}'`,
        [+userId],
      );

      // Запускаем запись асинхронно
      this.startRecordingForAct(newStream.id, newStream.title, +userId).catch(
        (err) => console.error(`Failed to start recording: ${err.message}`),
      );

      const resultStream = await this.prisma.act.findUnique({
        where: { id: newStream.id },
        omit: {
          sequelId: true,
          introId: true,
          outroId: true,
        },
        include: {
          sequel: {
            select: {
              id: true,
              title: true,
              coverFileName: true,
            },
          },
          intro: {
            select: {
              id: true,
              fileName: true,
            },
          },
          outro: {
            select: {
              id: true,
              fileName: true,
            },
          },
          musics: {
            include: {
              music: {
                select: {
                  id: true,
                  fileName: true,
                  length: true,
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
          tasks: {
            orderBy: {
              createdAt: 'asc',
            },
          },
          routePoints: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      return {
        // message: 'Stream launched successfully',
        ...resultStream,
        intro: {
          ...resultStream.intro,
          fileName: `${this.baseUrl}/${resultStream.intro.fileName}`,
        },
        outro: {
          ...resultStream.outro,
          fileName: `${this.baseUrl}/${resultStream.outro.fileName}`,
        },
        musics: resultStream.musics.map((actMusic) => ({
          ...actMusic.music,
          fileName: `${this.baseUrl}/${actMusic.music.fileName}`,
          order: actMusic.order,
        })),
        sequel: resultStream.sequel
          ? {
              ...resultStream.sequel,
              coverFileName: `${this.baseUrl}/${resultStream.sequel.coverFileName}`,
            }
          : null,
        previewFileName: `${this.baseUrl}${resultStream.previewFileName}`,
      };
    } catch (error) {
      console.error(`Error creating act: ${error.message}`);
      throw new NotFoundException(`Failed to create act: ${error.message}`);
    }
  }

  async getActById(id: number) {
    const resultStream = await this.prisma.act.findUnique({
      where: { id },
      omit: {
        sequelId: true,
        introId: true,
        outroId: true,
      },
      include: {
        sequel: {
          select: {
            id: true,
            title: true,
            coverFileName: true,
          },
        },
        intro: {
          select: {
            id: true,
            fileName: true,
          },
        },
        outro: {
          select: {
            id: true,
            fileName: true,
          },
        },
        musics: {
          include: {
            music: {
              select: {
                id: true,
                fileName: true,
                length: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        tasks: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        routePoints: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!resultStream) {
      throw new BadRequestException('Act with this id not found');
    }

    return {
      // message: 'Stream launched successfully',
      ...resultStream,
      intro: {
        ...resultStream.intro,
        fileName: `${this.baseUrl}/${resultStream.intro.fileName}`,
      },
      outro: {
        ...resultStream.outro,
        fileName: `${this.baseUrl}/${resultStream.outro.fileName}`,
      },
      musics: resultStream.musics.map((actMusic) => ({
        ...actMusic.music,
        fileName: `${this.baseUrl}/${actMusic.music.fileName}`,
        order: actMusic.order,
      })),
      sequel: resultStream.sequel
        ? {
            ...resultStream.sequel,
            coverFileName: `${this.baseUrl}/${resultStream.sequel.coverFileName}`,
          }
        : null,
      previewFileName: `${this.baseUrl}${resultStream.previewFileName}`,
    };
  }

  async getActs() {
    const streams = await this.prisma.act.findMany({
      include: {
        user: true,
        category: true,
        tasks: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        routePoints: {
          orderBy: {
            order: 'asc',
          },
        },
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
      await this.prisma.act.update({
        where: { id },
        data: {
          status: 'OFFLINE', // или новый enum FINISHED
          endedAt: new Date(),
          // recordingStatus обновится позже через webhook
        },
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

      // Останавливаем запись асинхронно
      this.stopRecordingForAct(id).catch((err) =>
        console.error(`Failed to stop recording: ${err.message}`),
      );

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
    try {
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);

      // Проверяем валидность дат
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return '00:00:00';
      }

      const diffMs = endDate.getTime() - startDate.getTime();
      const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;

      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0'),
      ].join(':');
    } catch (error) {
      console.error('Error formatting time difference:', error);
      return '00:00:00';
    }
  }

  /**
   * Форматирует дату старта трансляции в формат "21 Jan. 15:30"
   * @param startedAt дата начала стрима
   * @returns отформатированная дата
   */
  private formatStartDate(startedAt: Date | string): string {
    try {
      let date: Date;

      // Если передана дата как объект Date, используем её напрямую
      if (startedAt instanceof Date) {
        date = startedAt;
      } else {
        // Если строка пустая или некорректная
        if (!startedAt || startedAt === 'string' || startedAt.length < 8) {
          date = new Date();
        } else {
          date = new Date(startedAt);
        }
      }

      // Проверяем валидность даты
      if (isNaN(date.getTime())) {
        console.warn('Could not parse startedAt:', startedAt);
        date = new Date();
      }

      // Формат: "21 Jan. 15:30"
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      const day = date.getDate();
      const month = months[date.getMonth()];
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day} ${month}. ${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting start date:', error);
      const now = new Date();
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      const day = now.getDate();
      const month = months[now.getMonth()];
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');

      return `${day} ${month}. ${hours}:${minutes}`;
    }
  }

  /**
   * Форматирует время до начала трансляции в формат "Live in 2h 15m"
   * @param startedAt дата начала стрима
   * @returns отформатированное время
   */
  private formatLiveIn(startedAt: Date | string): string {
    try {
      let streamStartTime: Date;

      // Если передана дата как объект Date, используем её напрямую
      if (startedAt instanceof Date) {
        streamStartTime = startedAt;
      } else {
        // Если строка пустая или некорректная
        if (!startedAt || startedAt === 'string' || startedAt.length < 8) {
          return 'Just started';
        }

        // Пробуем распарсить строку
        streamStartTime = new Date(startedAt);

        if (isNaN(streamStartTime.getTime())) {
          console.warn('Could not parse startedAt for liveIn:', startedAt);
          return 'Just started';
        }
      }

      const now = new Date();
      const diff = now.getTime() - streamStartTime.getTime();

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
    const totalSeconds = Math.floor(Math.abs(milliseconds) / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const weeks = Math.floor(totalDays / 7);

    const days = totalDays % 7;
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

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

  /**
   * Получить все задачи акта
   */
  async getActTasks(actId: number) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      select: { id: true },
    });

    if (!act) {
      throw new NotFoundException('Act not found');
    }

    return this.prisma.actTask.findMany({
      where: { actId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Переключить статус задачи (выполнена/не выполнена)
   */
  async toggleTaskStatus(actId: number, taskId: number, userId: number) {
    // Проверяем, что акт существует и принадлежит пользователю
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
    });

    if (!act) {
      throw new NotFoundException('Act not found');
    }

    if (act.userId !== userId) {
      throw new ForbiddenException(
        'You can only toggle tasks in your own acts',
      );
    }

    // Проверяем, что задача существует и принадлежит этому акту
    const task = await this.prisma.actTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.actId !== actId) {
      throw new BadRequestException('Task does not belong to this act');
    }

    // Переключаем статус
    const updatedTask = await this.prisma.actTask.update({
      where: { id: taskId },
      data: {
        isCompleted: !task.isCompleted,
        completedAt: !task.isCompleted ? new Date() : null,
      },
    });

    return updatedTask;
  }

  /**
   * Добавить новую задачу к акту
   */
  async addTaskToAct(actId: number, title: string, userId: number) {
    // Проверяем, что акт существует и принадлежит пользователю
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
    });

    if (!act) {
      throw new NotFoundException('Act not found');
    }

    if (act.userId !== userId) {
      throw new ForbiddenException('You can only add tasks to your own acts');
    }

    const newTask = await this.prisma.actTask.create({
      data: {
        title,
        actId,
        isCompleted: false,
      },
    });

    return newTask;
  }

  /**
   * Удалить задачу
   */
  async deleteTask(actId: number, taskId: number, userId: number) {
    // Проверяем, что акт существует и принадлежит пользователю
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
    });

    if (!act) {
      throw new NotFoundException('Act not found');
    }

    if (act.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete tasks from your own acts',
      );
    }

    // Проверяем, что задача существует
    const task = await this.prisma.actTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.actId !== actId) {
      throw new BadRequestException('Task does not belong to this act');
    }

    await this.prisma.actTask.delete({
      where: { id: taskId },
    });

    return { message: 'Task successfully deleted' };
  }

  /**
   * Начать запись акта через Agora Cloud Recording
   */
  private async startRecordingForAct(
    actId: number,
    actTitle: string,
    userId: number,
  ): Promise<void> {
    try {
      const channelName = `act_${actId}`;
      const uid = `${userId}`;

      // Генерируем токен для бота-рекордера
      const token = this.generateToken(
        channelName,
        'PUBLISHER',
        'uid',
        uid,
        86400,
      );

      // Шаг 1: Acquire
      const resourceId = await this.agoraRecordingService.acquire(
        channelName,
        uid,
      );

      // Шаг 2: Start Recording
      const { sid } = await this.agoraRecordingService.startRecording(
        resourceId,
        channelName,
        uid,
        token,
      );

      // Сохраняем данные записи в БД
      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingResourceId: resourceId,
          recordingSid: sid,
          recordingStatus: 'recording',
        },
      });

      console.log(
        `Recording started for act ${actId}: resourceId=${resourceId}, sid=${sid}`,
      );
    } catch (error) {
      console.error(
        `Failed to start recording for act ${actId}: ${error.message}`,
      );
      // Не прерываем создание акта, просто логируем ошибку
    }
  }

  /**
   * Остановить запись при завершении акта
   */
  private async stopRecordingForAct(actId: number): Promise<void> {
    try {
      const act = await this.prisma.act.findUnique({
        where: { id: actId },
        select: {
          recordingResourceId: true,
          recordingSid: true,
          userId: true,
          status: true,
        },
      });

      if (!act?.recordingResourceId || !act?.recordingSid) {
        console.log(`No recording found for act ${actId}`);
        return;
      }

      const channelName = `act_${actId}`;
      const uid = `${act.userId}`;

      // Останавливаем запись
      if (act.status == 'OFFLINE') {
        return;
      }
      await this.agoraRecordingService.stopRecording(
        act.recordingResourceId,
        act.recordingSid,
        channelName,
        uid,
      );

      // Обновляем статус
      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingStatus: 'processing',
        },
      });

      console.log(`Recording stopped for act ${actId}`);
    } catch (error) {
      console.error(
        `Failed to stop recording for act ${actId}: ${error.message}`,
      );
    }
  }

  // ==================== SPOT AGENT METHODS ====================

  /**
   * Подать заявку на роль Spot Agent
   */
  async applyAsSpotAgent(actId: number, userId: number) {
    // Проверяем существование акта
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      select: {
        id: true,
        userId: true,
        spotAgentCount: true,
        spotAgentCandidates: {
          select: { id: true },
        },
        spotAgents: {
          select: { id: true },
        },
      },
    });

    if (!act) {
      throw new NotFoundException(`Act with ID ${actId} not found`);
    }

    // Проверяем, что пользователь не является инициатором
    if (act.userId === userId) {
      throw new BadRequestException('Initiator cannot apply as spot agent');
    }

    // Проверяем, что spot-агенты нужны
    if (act.spotAgentCount === 0) {
      throw new BadRequestException('This act does not require spot agents');
    }

    // Проверяем, не подавал ли уже заявку
    const existingCandidate =
      await this.prisma.actSpotAgentCandidate.findUnique({
        where: {
          actId_userId: {
            actId,
            userId,
          },
        },
      });

    if (existingCandidate) {
      throw new BadRequestException('You have already applied as spot agent');
    }

    // Проверяем, не назначен ли уже spot-агентом
    const existingSpotAgent = await this.prisma.actSpotAgent.findUnique({
      where: {
        actId_userId: {
          actId,
          userId,
        },
      },
    });

    if (existingSpotAgent) {
      throw new BadRequestException('You are already assigned as spot agent');
    }

    // Создаем заявку
    const candidate = await this.prisma.actSpotAgentCandidate.create({
      data: {
        actId,
        userId,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
      },
    });

    return candidate;
  }

  /**
   * Получить всех кандидатов в Spot Agent для акта
   */
  async getSpotAgentCandidates(actId: number) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
    });

    if (!act) {
      throw new NotFoundException(`Act with ID ${actId} not found`);
    }

    const candidates = await this.prisma.actSpotAgentCandidate.findMany({
      where: { actId },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
        votes: {
          include: {
            voter: {
              select: {
                id: true,
                login: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        appliedAt: 'asc',
      },
    });

    // Добавляем количество голосов к каждому кандидату
    return candidates.map((candidate) => ({
      ...candidate,
      voteCount: candidate.votes.length,
    }));
  }

  /**
   * Проголосовать за кандидата в Spot Agent
   */
  async voteForSpotAgentCandidate(candidateId: number, voterId: number) {
    // Проверяем существование кандидата
    const candidate = await this.prisma.actSpotAgentCandidate.findUnique({
      where: { id: candidateId },
      include: {
        act: {
          select: {
            id: true,
            userId: true,
            spotAgentMethods: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Проверяем, что для этого акта включено голосование
    if (candidate.act.spotAgentMethods !== 'VOTING') {
      throw new BadRequestException('Voting is not enabled for this act');
    }

    // Проверяем, что пользователь не голосует за себя
    if (candidate.userId === voterId) {
      throw new BadRequestException('You cannot vote for yourself');
    }

    // Проверяем, не голосовал ли уже
    const existingVote = await this.prisma.actSpotAgentVote.findUnique({
      where: {
        candidateId_voterId: {
          candidateId,
          voterId,
        },
      },
    });

    if (existingVote) {
      throw new BadRequestException(
        'You have already voted for this candidate',
      );
    }

    // Создаем голос
    const vote = await this.prisma.actSpotAgentVote.create({
      data: {
        candidateId,
        voterId,
      },
      include: {
        voter: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
        candidate: {
          include: {
            user: {
              select: {
                id: true,
                login: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return vote;
  }

  /**
   * Назначить Spot Agent (только инициатор)
   */
  async assignSpotAgent(
    actId: number,
    userId: number,
    initiatorId: number,
    task?: string,
  ) {
    // Проверяем существование акта
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      include: {
        spotAgents: true,
      },
    });

    if (!act) {
      throw new NotFoundException(`Act with ID ${actId} not found`);
    }

    // Проверяем, что запрос от инициатора
    if (act.userId !== initiatorId) {
      throw new ForbiddenException('Only the initiator can assign spot agents');
    }

    // Проверяем, что не превышено количество spot-агентов
    if (act.spotAgents.length >= act.spotAgentCount) {
      throw new BadRequestException('Maximum number of spot agents reached');
    }

    // Проверяем, что пользователь не инициатор
    if (userId === initiatorId) {
      throw new BadRequestException(
        'Initiator cannot be assigned as spot agent',
      );
    }

    // Проверяем, не назначен ли уже
    const existingSpotAgent = await this.prisma.actSpotAgent.findUnique({
      where: {
        actId_userId: {
          actId,
          userId,
        },
      },
    });

    if (existingSpotAgent) {
      throw new BadRequestException('User is already assigned as spot agent');
    }

    // Назначаем spot-агента
    const spotAgent = await this.prisma.actSpotAgent.create({
      data: {
        actId,
        userId,
        task: task || null,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
      },
    });

    // Обновляем статус кандидата, если он подавал заявку
    await this.prisma.actSpotAgentCandidate.updateMany({
      where: {
        actId,
        userId,
      },
      data: {
        status: 'approved',
      },
    });

    return spotAgent;
  }

  /**
   * Получить всех назначенных Spot Agent для акта
   */
  async getAssignedSpotAgents(actId: number) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
    });

    if (!act) {
      throw new NotFoundException(`Act with ID ${actId} not found`);
    }

    const spotAgents = await this.prisma.actSpotAgent.findMany({
      where: { actId },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'asc',
      },
    });

    return spotAgents;
  }

  /**
   * Отозвать Spot Agent (только инициатор)
   */
  async removeSpotAgent(
    actId: number,
    spotAgentId: number,
    initiatorId: number,
  ) {
    // Проверяем существование акта
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
    });

    if (!act) {
      throw new NotFoundException(`Act with ID ${actId} not found`);
    }

    // Проверяем, что запрос от инициатора
    if (act.userId !== initiatorId) {
      throw new ForbiddenException('Only the initiator can remove spot agents');
    }

    // Проверяем существование spot-агента
    const spotAgent = await this.prisma.actSpotAgent.findUnique({
      where: { id: spotAgentId },
    });

    if (!spotAgent || spotAgent.actId !== actId) {
      throw new NotFoundException(
        `Spot agent with ID ${spotAgentId} not found`,
      );
    }

    // Удаляем spot-агента
    await this.prisma.actSpotAgent.delete({
      where: { id: spotAgentId },
    });

    return { message: 'Spot agent removed successfully' };
  }

  // ... существующий код ActService ...

  async applyForRole(
    actId: number,
    userId: number,
    roleType: 'hero' | 'navigator',
    bidAmount?: number,
    bidItem?: string,
  ) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      select: {
        heroMethods: true,
        navigatorMethods: true,
        biddingTime: true,
      },
    });

    if (!act) throw new NotFoundException('Act not found');

    const method = roleType === 'hero' ? act.heroMethods : act.navigatorMethods;

    // Проверка времени торгов
    if (
      method !== SelectionMethods.MANUAL &&
      act.biddingTime &&
      new Date() > act.biddingTime
    ) {
      throw new BadRequestException('Bidding time has expired');
    }

    // Проверка, что пользователь ещё не в этой роли
    const existingParticipant = await this.prisma.actParticipant.findFirst({
      where: {
        actId,
        userId,
        role: roleType,
      },
    });

    if (existingParticipant) {
      throw new BadRequestException(
        `User already applied for role ${roleType}`,
      );
    }

    if (method === SelectionMethods.MANUAL) {
      // Для MANUAL сразу создаём participant с pending статусом
      return this.prisma.actParticipant.create({
        data: {
          actId,
          userId,
          role: roleType,
          status: 'pending',
        },
        include: { user: { select: { id: true, login: true, email: true } } },
      });
    }

    // Для VOTING и BIDDING — создаём кандидатуру
    return this.prisma.roleCandidate.create({
      data: {
        actId,
        userId,
        roleType,
        method,
        bidAmount: method === SelectionMethods.BIDDING ? bidAmount : null,
        bidItem: method === SelectionMethods.BIDDING ? bidItem : null,
        status: 'pending',
      },
      include: {
        user: { select: { id: true, login: true, email: true } },
      },
    });
  }

  async voteForCandidate(candidateId: number, voterId: number) {
    const candidate = await this.prisma.roleCandidate.findUnique({
      where: { id: candidateId },
      include: {
        act: { select: { heroMethods: true, navigatorMethods: true } },
      },
    });

    if (!candidate) throw new NotFoundException('Candidate not found');

    const method =
      candidate.roleType === 'hero'
        ? candidate.act.heroMethods
        : candidate.act.navigatorMethods;

    if (method !== SelectionMethods.VOTING) {
      throw new BadRequestException(
        `Voting is not allowed for method ${method}`,
      );
    }

    if (candidate.userId === voterId) {
      throw new BadRequestException('Cannot vote for yourself');
    }

    const existingVote = await this.prisma.roleVote.findUnique({
      where: {
        candidateId_voterId: {
          candidateId,
          voterId,
        },
      },
    });

    if (existingVote)
      throw new BadRequestException(
        'You have already voted for this candidate',
      );

    return this.prisma.roleVote.create({
      data: {
        candidateId,
        voterId,
      },
      include: {
        voter: { select: { id: true, login: true, email: true } },
      },
    });
  }

  async assignRole(
    actId: number,
    initiatorId: number,
    roleType: 'hero' | 'navigator',
    candidateId?: number,
  ) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      select: { userId: true, heroMethods: true, navigatorMethods: true },
    });

    if (!act) throw new NotFoundException('Act not found');

    if (act.userId !== initiatorId) {
      throw new ForbiddenException('Only the act initiator can assign roles');
    }

    const method = roleType === 'hero' ? act.heroMethods : act.navigatorMethods;

    let selectedUserId: number;

    if (method === SelectionMethods.MANUAL) {
      if (!candidateId)
        throw new BadRequestException(
          'Candidate ID is required for MANUAL method',
        );
      const candidate = await this.prisma.roleCandidate.findUnique({
        where: { id: candidateId },
      });
      if (
        !candidate ||
        candidate.actId !== actId ||
        candidate.roleType !== roleType
      ) {
        throw new BadRequestException('Invalid candidate for this role');
      }
      selectedUserId = candidate.userId;
    } else if (method === SelectionMethods.VOTING) {
      // Находим кандидата с наибольшим количеством голосов
      const topCandidate = await this.prisma.roleCandidate.findFirst({
        where: { actId, roleType, method: SelectionMethods.VOTING },
        include: { _count: { select: { votes: true } } },
        orderBy: { votes: { _count: 'desc' } },
      });

      if (!topCandidate || topCandidate._count.votes === 0) {
        throw new BadRequestException('No candidates with votes for this role');
      }

      selectedUserId = topCandidate.userId;
    } else if (method === SelectionMethods.BIDDING) {
      // Находим кандидата с максимальной ставкой
      const topBid = await this.prisma.roleCandidate.findFirst({
        where: { actId, roleType, method: SelectionMethods.BIDDING },
        orderBy: { bidAmount: 'desc' },
      });

      if (!topBid || !topBid.bidAmount) {
        throw new BadRequestException('No valid bids for this role');
      }

      selectedUserId = topBid.userId;
    }

    // Назначаем роль
    const participant = await this.prisma.actParticipant.create({
      data: {
        actId,
        userId: selectedUserId,
        role: roleType,
        status: 'active',
      },
      include: {
        user: { select: { id: true, login: true, email: true } },
      },
    });

    // Опционально: обновляем статус кандидата
    await this.prisma.roleCandidate.updateMany({
      where: { actId, roleType, userId: selectedUserId },
      data: { status: 'approved' },
    });

    return participant;
  }

  async getCandidates(actId: number, roleType: 'hero' | 'navigator') {
    // Вместо orderBy с _count
    const candidates = await this.prisma.roleCandidate.findMany({
      where: { actId, roleType, method: SelectionMethods.VOTING },
      include: {
        user: { select: { id: true, login: true, email: true } },
        votes: true,
        _count: { select: { votes: true } },
      },
    });

    // Сортируем вручную по количеству голосов
    candidates.sort((a, b) => b._count.votes - a._count.votes);

    if (candidates.length === 0 || candidates[0]._count.votes === 0) {
      throw new BadRequestException('No candidates with votes for this role');
    }

    const topCandidate = candidates[0];

    return candidates;
  }
}
