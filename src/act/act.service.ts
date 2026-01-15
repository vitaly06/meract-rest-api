import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import moment from 'moment';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import { CreateActRequest } from './dto/create-act.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';
import { ConfigService } from '@nestjs/config';
import { AgoraRecordingService } from 'src/agora-recording/agora-recording.service';

@Injectable()
export class ActService {
  private readonly baseUrl: string;
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
                dto.startLatitude &&
                  dto.startLongitude &&
                  dto.destinationLatitude &&
                  dto.destinationLongitude
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
        },
      });

      if (!act?.recordingResourceId || !act?.recordingSid) {
        console.log(`No recording found for act ${actId}`);
        return;
      }

      const channelName = `act_${actId}`;
      const uid = `${act.userId}`;

      // Останавливаем запись
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
}
