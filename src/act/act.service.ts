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
import { GeoService } from 'src/geo/geo.service';

@Injectable()
export class ActService {
  private readonly baseUrl: string;
  private readonly logger = new Logger(ActService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    private readonly agoraRecordingService: AgoraRecordingService,
    private readonly geoService: GeoService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
  }

  async createAct(dto: CreateActRequest, userId: number, filename?: string) {
    const { title, description, sequelId, teams, tags } = dto;

    // Проверка пользователя
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверка сиквела, если указан
    if (sequelId) {
      const sequel = await this.prisma.sequel.findUnique({
        where: { id: sequelId },
      });
      if (!sequel) {
        throw new NotFoundException(`Сиквел с ID ${sequelId} не найден`);
      }
    }

    // Сбор и проверка всех кандидатов (уникальные ID)
    const allCandidateIds = [
      ...new Set(
        (teams ?? []).flatMap((team) =>
          team.roles.flatMap((role) =>
            !role.openVoting && role.candidateUserIds
              ? role.candidateUserIds
              : [],
          ),
        ),
      ),
    ];

    if (allCandidateIds.length) {
      const existingCount = await this.prisma.user.count({
        where: { id: { in: allCandidateIds } },
      });
      if (existingCount !== allCandidateIds.length) {
        throw new NotFoundException('Один или несколько кандидатов не найдены');
      }
    }

    const act = await this.prisma.act.create({
      data: {
        title,
        description: description ?? null,
        sequelId: sequelId ?? null,
        userId,
        previewFileName: filename ? `/uploads/acts/${filename}` : null,
        status: 'ONLINE',
        startedAt: new Date(),
        tags: tags ?? [], // ← Добавляем теги
        teams: {
          create: (teams ?? []).map((team) => ({
            name: team.name,
            roleConfigs: {
              create: team.roles.map((role) => ({
                role: role.role,
                openVoting: role.openVoting,
                votingStartAt: role.votingStartAt
                  ? new Date(role.votingStartAt)
                  : null,
                votingDurationHours: role.votingDurationHours ?? null,
                candidates:
                  !role.openVoting && role.candidateUserIds?.length
                    ? {
                        create: role.candidateUserIds.map((uid) => ({
                          userId: uid,
                        })),
                      }
                    : undefined,
              })),
            },
            tasks: team.tasks?.length
              ? {
                  create: team.tasks.map((task, index) => ({
                    description: task.description,
                    address: task.address ?? null,
                    order: index,
                  })),
                }
              : undefined,
          })),
        },
      },
      include: {
        user: {
          select: { id: true, login: true, email: true, avatarUrl: true },
        },
        sequel: { select: { id: true, title: true, coverFileName: true } },
        teams: {
          include: {
            roleConfigs: {
              include: {
                candidates: {
                  include: {
                    user: {
                      select: { id: true, login: true, avatarUrl: true },
                    },
                  },
                },
              },
            },
            tasks: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    await this.utilsService.addRecordToActivityJournal(
      `Пользователь ${user.login || user.email} создал акт: '${act.title}'`,
      [userId],
    );

    this.startRecordingForAct(act.id, act.title, userId).catch((err) =>
      console.error(`Не удалось запустить запись: ${err.message}`),
    );

    return act;
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

  async getActs(currentUserId?: number) {
    const streams = await this.prisma.act.findMany({
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
            city: true,
            country: true,
          },
        },
        category: true,
        tasks: { orderBy: { createdAt: 'asc' } },
        routePoints: { orderBy: { order: 'asc' } },
        participants: {
          where: { role: { in: ['hero', 'navigator'] } },
          include: { user: { select: { login: true, email: true } } },
        },
      },
    });

    if (!streams || streams.length === 0) return [];

    let currentUserCoords: { lat: number; lon: number } | null = null;
    if (currentUserId) {
      const me = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { city: true, country: true },
      });
      if (me?.city) {
        currentUserCoords = await this.geoService.getCityCoordinates(
          me.city,
          me.country,
        );
      }
    }

    const uniqueCityMap = new Map<
      string,
      { lat: number; lon: number } | null
    >();
    for (const stream of streams) {
      const key = `${stream.user.city ?? ''}|${stream.user.country ?? ''}`;
      if (stream.user.city && !uniqueCityMap.has(key))
        uniqueCityMap.set(key, null);
    }
    for (const key of uniqueCityMap.keys()) {
      const [city, country] = key.split('|');
      uniqueCityMap.set(
        key,
        await this.geoService.getCityCoordinates(city, country || undefined),
      );
    }

    const result = streams.map((stream) => {
      const key = `${stream.user.city ?? ''}|${stream.user.country ?? ''}`;
      const initiatorCoords = stream.user.city
        ? (uniqueCityMap.get(key) ?? null)
        : null;
      let distanceKm: number | null = null;
      if (currentUserCoords && initiatorCoords) {
        distanceKm = this.geoService.haversineKm(
          currentUserCoords.lat,
          currentUserCoords.lon,
          initiatorCoords.lat,
          initiatorCoords.lon,
        );
      }
      const heroes = stream.participants
        .filter((p) => p.role === 'hero')
        .map((p) => p.user.login || p.user.email);
      const navigators = stream.participants
        .filter((p) => p.role === 'navigator')
        .map((p) => p.user.login || p.user.email);

      return {
        id: stream.id,
        name: stream.title || '',
        description: stream.description,
        previewFileName: `${this.baseUrl}${stream.previewFileName}`,
        user: stream.user.login || stream.user.email,
        initiator: {
          city: stream.user.city ?? null,
          country: stream.user.country ?? null,
        },
        distanceKm,
        heroes,
        navigators,
        category: stream.category?.name || '',
        categoryId: stream.category?.id,
        status: stream.status || '',
        spectators: 'Not implemented',
        duration: this.formatTimeDifference(
          stream.startedAt,
          stream.endedAt || new Date(),
        ),
        startDate: this.formatStartDate(stream.startedAt),
        liveIn: this.formatLiveIn(stream.startedAt),
      };
    });

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

    // РџСЂРѕРІРµСЂРєР° РїСЂР°РІ РґРѕСЃС‚СѓРїР° (РЅР°РїСЂРёРјРµСЂ, С‚РѕР»СЊРєРѕ Р°РґРјРёРЅ РёР»Рё РІР»Р°РґРµР»РµС† РјРѕР¶РµС‚ РѕСЃС‚Р°РЅРѕРІРёС‚СЊ СЃС‚СЂРёРј)
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
          status: 'OFFLINE', // РёР»Рё РЅРѕРІС‹Р№ enum FINISHED
          endedAt: new Date(),
          // recordingStatus РѕР±РЅРѕРІРёС‚СЃСЏ РїРѕР·Р¶Рµ С‡РµСЂРµР· webhook
        },
      });
      if (currentAdmin.id !== currentStream.userId) {
        // РЈРІРµР»РёС‡РёРІР°РµРј СЃС‡С‘С‚С‡РёРє РѕСЃС‚Р°РЅРѕРІРѕРє РґР»СЏ Р°РґРјРёРЅР°
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

      // РћСЃС‚Р°РЅР°РІР»РёРІР°РµРј Р·Р°РїРёСЃСЊ Р°СЃРёРЅС…СЂРѕРЅРЅРѕ
      this.stopRecordingForAct(id).catch((err) =>
        console.error(`Failed to stop recording: ${err.message}`),
      );

      return { message: 'Stream successfully stopped' };
    } catch (error) {
      console.error(`Error stopping act ${id}: ${error}`);
      throw new NotFoundException(`Failed to stop act: ${error}`);
    }
  }

  async getStatistic() {
    try {
      // РљРѕР»РёС‡РµСЃС‚РІРѕ Р°РєС‚РёРІРЅС‹С… СЃС‚СЂРёРјРѕРІ
      const activeStreams = await this.prisma.act.count({
        where: {
          status: 'ONLINE',
        },
      });

      // РЎС‚СЂРёРјС‹, РѕСЃС‚Р°РЅРѕРІР»РµРЅРЅС‹Рµ Р°РґРјРёРЅР°РјРё
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
        allSpectators: 'Not implemented', // Р—Р°РјРµРЅРёС‚Рµ, РµСЃР»Рё РµСЃС‚СЊ СЂРµР°Р»РёР·Р°С†РёСЏ
        adminBlocked,
      };
    } catch (error) {
      console.error(`Error fetching statistics: ${error}`);
      throw new NotFoundException(`Failed to fetch statistics: ${error}`);
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
      console.error(`Error generating Agora token: ${error}`);
      throw new Error(`Failed to generate token: ${error}`);
    }
  }

  private formatTimeDifference(
    start: Date | string,
    end: Date | string,
  ): string {
    try {
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);

      // РџСЂРѕРІРµСЂСЏРµРј РІР°Р»РёРґРЅРѕСЃС‚СЊ РґР°С‚
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
   * Р¤РѕСЂРјР°С‚РёСЂСѓРµС‚ РґР°С‚Сѓ СЃС‚Р°СЂС‚Р° С‚СЂР°РЅСЃР»СЏС†РёРё РІ С„РѕСЂРјР°С‚ "21 Jan. 15:30"
   * @param startedAt РґР°С‚Р° РЅР°С‡Р°Р»Р° СЃС‚СЂРёРјР°
   * @returns РѕС‚С„РѕСЂРјР°С‚РёСЂРѕРІР°РЅРЅР°СЏ РґР°С‚Р°
   */
  private formatStartDate(startedAt: Date | string): string {
    try {
      let date: Date;

      // Р•СЃР»Рё РїРµСЂРµРґР°РЅР° РґР°С‚Р° РєР°Рє РѕР±СЉРµРєС‚ Date, РёСЃРїРѕР»СЊР·СѓРµРј РµС‘ РЅР°РїСЂСЏРјСѓСЋ
      if (startedAt instanceof Date) {
        date = startedAt;
      } else {
        // Р•СЃР»Рё СЃС‚СЂРѕРєР° РїСѓСЃС‚Р°СЏ РёР»Рё РЅРµРєРѕСЂСЂРµРєС‚РЅР°СЏ
        if (!startedAt || startedAt === 'string' || startedAt.length < 8) {
          date = new Date();
        } else {
          date = new Date(startedAt);
        }
      }

      // РџСЂРѕРІРµСЂСЏРµРј РІР°Р»РёРґРЅРѕСЃС‚СЊ РґР°С‚С‹
      if (isNaN(date.getTime())) {
        console.warn('Could not parse startedAt:', startedAt);
        date = new Date();
      }

      // Р¤РѕСЂРјР°С‚: "21 Jan. 15:30"
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
   * Р¤РѕСЂРјР°С‚РёСЂСѓРµС‚ РІСЂРµРјСЏ РґРѕ РЅР°С‡Р°Р»Р° С‚СЂР°РЅСЃР»СЏС†РёРё РІ С„РѕСЂРјР°С‚ "Live in 2h 15m"
   * @param startedAt РґР°С‚Р° РЅР°С‡Р°Р»Р° СЃС‚СЂРёРјР°
   * @returns РѕС‚С„РѕСЂРјР°С‚РёСЂРѕРІР°РЅРЅРѕРµ РІСЂРµРјСЏ
   */
  private formatLiveIn(startedAt: Date | string): string {
    try {
      let streamStartTime: Date;

      // Р•СЃР»Рё РїРµСЂРµРґР°РЅР° РґР°С‚Р° РєР°Рє РѕР±СЉРµРєС‚ Date, РёСЃРїРѕР»СЊР·СѓРµРј РµС‘ РЅР°РїСЂСЏРјСѓСЋ
      if (startedAt instanceof Date) {
        streamStartTime = startedAt;
      } else {
        // Р•СЃР»Рё СЃС‚СЂРѕРєР° РїСѓСЃС‚Р°СЏ РёР»Рё РЅРµРєРѕСЂСЂРµРєС‚РЅР°СЏ
        if (!startedAt || startedAt === 'string' || startedAt.length < 8) {
          return 'Just started';
        }

        // РџСЂРѕР±СѓРµРј СЂР°СЃРїР°СЂСЃРёС‚СЊ СЃС‚СЂРѕРєСѓ
        streamStartTime = new Date(startedAt);

        if (isNaN(streamStartTime.getTime())) {
          console.warn('Could not parse startedAt for liveIn:', startedAt);
          return 'Just started';
        }
      }

      const now = new Date();
      const diff = now.getTime() - streamStartTime.getTime();

      // Р•СЃР»Рё СЃС‚СЂРёРј СѓР¶Рµ РЅР°С‡Р°Р»СЃСЏ, РїРѕРєР°Р·С‹РІР°РµРј СЃРєРѕР»СЊРєРѕ РІСЂРµРјРµРЅРё РѕРЅ РёРґРµС‚
      if (diff >= 0) {
        return this.formatDuration(diff);
      }

      // Р•СЃР»Рё РІСЂРµРјСЏ РµС‰С‘ РЅРµ РїСЂРёС€Р»Рѕ (С‡С‚Рѕ РјР°Р»РѕРІРµСЂРѕСЏС‚РЅРѕ РґР»СЏ startedAt)
      return `Starts in ${this.formatDuration(-diff)}`;
    } catch (error) {
      console.error('Error formatting liveIn:', error);
      return 'Just started';
    }
  }

  /**
   * Р¤РѕСЂРјР°С‚РёСЂСѓРµС‚ РїСЂРѕРґРѕР»Р¶РёС‚РµР»СЊРЅРѕСЃС‚СЊ РІ С‡РёС‚Р°РµРјС‹Р№ С„РѕСЂРјР°С‚ СЃ РЅРµРґРµР»СЏРјРё, РґРЅСЏРјРё, С‡Р°СЃР°РјРё Рё РјРёРЅСѓС‚Р°РјРё
   * @param milliseconds РїСЂРѕРґРѕР»Р¶РёС‚РµР»СЊРЅРѕСЃС‚СЊ РІ РјРёР»Р»РёСЃРµРєСѓРЅРґР°С…
   * @returns РѕС‚С„РѕСЂРјР°С‚РёСЂРѕРІР°РЅРЅР°СЏ СЃС‚СЂРѕРєР°
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

    // Р•СЃР»Рё РЅРёС‡РµРіРѕ РЅРµС‚, Р·РЅР°С‡РёС‚ С‚РѕР»СЊРєРѕ С‡С‚Рѕ РЅР°С‡Р°Р»СЃСЏ
    if (parts.length === 0) {
      return 'Just started';
    }

    // РџРѕРєР°Р·С‹РІР°РµРј РјР°РєСЃРёРјСѓРј 2 РµРґРёРЅРёС†С‹ РІСЂРµРјРµРЅРё РґР»СЏ РєСЂР°С‚РєРѕСЃС‚Рё
    return parts.slice(0, 2).join(' ');
  }

  /**
   * РџРѕР»СѓС‡РёС‚СЊ РІСЃРµ Р·Р°РґР°С‡Рё Р°РєС‚Р°
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
   * РџРµСЂРµРєР»СЋС‡РёС‚СЊ СЃС‚Р°С‚СѓСЃ Р·Р°РґР°С‡Рё (РІС‹РїРѕР»РЅРµРЅР°/РЅРµ РІС‹РїРѕР»РЅРµРЅР°)
   */
  async toggleTaskStatus(actId: number, taskId: number, userId: number) {
    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ Р°РєС‚ СЃСѓС‰РµСЃС‚РІСѓРµС‚ Рё РїСЂРёРЅР°РґР»РµР¶РёС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЋ
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

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ Р·Р°РґР°С‡Р° СЃСѓС‰РµСЃС‚РІСѓРµС‚ Рё РїСЂРёРЅР°РґР»РµР¶РёС‚ СЌС‚РѕРјСѓ Р°РєС‚Сѓ
    const task = await this.prisma.actTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.actId !== actId) {
      throw new BadRequestException('Task does not belong to this act');
    }

    // РџРµСЂРµРєР»СЋС‡Р°РµРј СЃС‚Р°С‚СѓСЃ
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
   * Р”РѕР±Р°РІРёС‚СЊ РЅРѕРІСѓСЋ Р·Р°РґР°С‡Сѓ Рє Р°РєС‚Сѓ
   */
  async addTaskToAct(actId: number, title: string, userId: number) {
    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ Р°РєС‚ СЃСѓС‰РµСЃС‚РІСѓРµС‚ Рё РїСЂРёРЅР°РґР»РµР¶РёС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЋ
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
   * РЈРґР°Р»РёС‚СЊ Р·Р°РґР°С‡Сѓ
   */
  async deleteTask(actId: number, taskId: number, userId: number) {
    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ Р°РєС‚ СЃСѓС‰РµСЃС‚РІСѓРµС‚ Рё РїСЂРёРЅР°РґР»РµР¶РёС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЋ
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

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ Р·Р°РґР°С‡Р° СЃСѓС‰РµСЃС‚РІСѓРµС‚
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
   * РќР°С‡Р°С‚СЊ Р·Р°РїРёСЃСЊ Р°РєС‚Р° С‡РµСЂРµР· Agora Cloud Recording
   */
  private async startRecordingForAct(
    actId: number,
    actTitle: string,
    userId: number,
  ): Promise<void> {
    try {
      const channelName = `act_${actId}`;
      const uid = `${userId}`;

      // Р“РµРЅРµСЂРёСЂСѓРµРј С‚РѕРєРµРЅ РґР»СЏ Р±РѕС‚Р°-СЂРµРєРѕСЂРґРµСЂР°
      const token = this.generateToken(
        channelName,
        'PUBLISHER',
        'uid',
        uid,
        86400,
      );

      // РЁР°Рі 1: Acquire
      const resourceId = await this.agoraRecordingService.acquire(
        channelName,
        uid,
      );

      // РЁР°Рі 2: Start Recording
      const { sid } = await this.agoraRecordingService.startRecording(
        resourceId,
        channelName,
        uid,
        token,
      );

      // РЎРѕС…СЂР°РЅСЏРµРј РґР°РЅРЅС‹Рµ Р·Р°РїРёСЃРё РІ Р‘Р”
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
      console.error(`Failed to start recording for act ${actId}: ${error}`);
      // РќРµ РїСЂРµСЂС‹РІР°РµРј СЃРѕР·РґР°РЅРёРµ Р°РєС‚Р°, РїСЂРѕСЃС‚Рѕ Р»РѕРіРёСЂСѓРµРј РѕС€РёР±РєСѓ
    }
  }

  /**
   * РћСЃС‚Р°РЅРѕРІРёС‚СЊ Р·Р°РїРёСЃСЊ РїСЂРё Р·Р°РІРµСЂС€РµРЅРёРё Р°РєС‚Р°
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

      // РћСЃС‚Р°РЅР°РІР»РёРІР°РµРј Р·Р°РїРёСЃСЊ
      if (act.status == 'OFFLINE') {
        return;
      }
      await this.agoraRecordingService.stopRecording(
        act.recordingResourceId,
        act.recordingSid,
        channelName,
        uid,
      );

      // РћР±РЅРѕРІР»СЏРµРј СЃС‚Р°С‚СѓСЃ
      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingStatus: 'processing',
        },
      });

      console.log(`Recording stopped for act ${actId}`);
    } catch (error) {
      console.error(`Failed to stop recording for act ${actId}: ${error}`);
    }
  }

  // ==================== SPOT AGENT METHODS ====================

  /**
   * РџРѕРґР°С‚СЊ Р·Р°СЏРІРєСѓ РЅР° СЂРѕР»СЊ Spot Agent
   */
  async applyAsSpotAgent(actId: number, userId: number) {
    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ Р°РєС‚Р°
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

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РёРЅРёС†РёР°С‚РѕСЂРѕРј
    if (act.userId === userId) {
      throw new BadRequestException('Initiator cannot apply as spot agent');
    }

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ spot-Р°РіРµРЅС‚С‹ РЅСѓР¶РЅС‹
    if (act.spotAgentCount === 0) {
      throw new BadRequestException('This act does not require spot agents');
    }

    // РџСЂРѕРІРµСЂСЏРµРј, РЅРµ РїРѕРґР°РІР°Р» Р»Рё СѓР¶Рµ Р·Р°СЏРІРєСѓ
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

    // РџСЂРѕРІРµСЂСЏРµРј, РЅРµ РЅР°Р·РЅР°С‡РµРЅ Р»Рё СѓР¶Рµ spot-Р°РіРµРЅС‚РѕРј
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

    // РЎРѕР·РґР°РµРј Р·Р°СЏРІРєСѓ
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
   * РџРѕР»СѓС‡РёС‚СЊ РІСЃРµС… РєР°РЅРґРёРґР°С‚РѕРІ РІ Spot Agent РґР»СЏ Р°РєС‚Р°
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

    // Р”РѕР±Р°РІР»СЏРµРј РєРѕР»РёС‡РµСЃС‚РІРѕ РіРѕР»РѕСЃРѕРІ Рє РєР°Р¶РґРѕРјСѓ РєР°РЅРґРёРґР°С‚Сѓ
    return candidates.map((candidate) => ({
      ...candidate,
      voteCount: candidate.votes.length,
    }));
  }

  /**
   * РџСЂРѕРіРѕР»РѕСЃРѕРІР°С‚СЊ Р·Р° РєР°РЅРґРёРґР°С‚Р° РІ Spot Agent
   */
  async voteForSpotAgentCandidate(candidateId: number, voterId: number) {
    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ РєР°РЅРґРёРґР°С‚Р°
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

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РґР»СЏ СЌС‚РѕРіРѕ Р°РєС‚Р° РІРєР»СЋС‡РµРЅРѕ РіРѕР»РѕСЃРѕРІР°РЅРёРµ
    if (candidate.act.spotAgentMethods !== 'VOTING') {
      throw new BadRequestException('Voting is not enabled for this act');
    }

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РіРѕР»РѕСЃСѓРµС‚ Р·Р° СЃРµР±СЏ
    if (candidate.userId === voterId) {
      throw new BadRequestException('You cannot vote for yourself');
    }

    // РџСЂРѕРІРµСЂСЏРµРј, РЅРµ РіРѕР»РѕСЃРѕРІР°Р» Р»Рё СѓР¶Рµ
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

    // РЎРѕР·РґР°РµРј РіРѕР»РѕСЃ
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
   * РќР°Р·РЅР°С‡РёС‚СЊ Spot Agent (С‚РѕР»СЊРєРѕ РёРЅРёС†РёР°С‚РѕСЂ)
   */
  async assignSpotAgent(
    actId: number,
    userId: number,
    initiatorId: number,
    task?: string,
  ) {
    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ Р°РєС‚Р°
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      include: {
        spotAgents: true,
      },
    });

    if (!act) {
      throw new NotFoundException(`Act with ID ${actId} not found`);
    }

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ Р·Р°РїСЂРѕСЃ РѕС‚ РёРЅРёС†РёР°С‚РѕСЂР°
    if (act.userId !== initiatorId) {
      throw new ForbiddenException('Only the initiator can assign spot agents');
    }

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РЅРµ РїСЂРµРІС‹С€РµРЅРѕ РєРѕР»РёС‡РµСЃС‚РІРѕ spot-Р°РіРµРЅС‚РѕРІ
    if (act.spotAgents.length >= act.spotAgentCount) {
      throw new BadRequestException('Maximum number of spot agents reached');
    }

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РёРЅРёС†РёР°С‚РѕСЂ
    if (userId === initiatorId) {
      throw new BadRequestException(
        'Initiator cannot be assigned as spot agent',
      );
    }

    // РџСЂРѕРІРµСЂСЏРµРј, РЅРµ РЅР°Р·РЅР°С‡РµРЅ Р»Рё СѓР¶Рµ
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

    // РќР°Р·РЅР°С‡Р°РµРј spot-Р°РіРµРЅС‚Р°
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

    // РћР±РЅРѕРІР»СЏРµРј СЃС‚Р°С‚СѓСЃ РєР°РЅРґРёРґР°С‚Р°, РµСЃР»Рё РѕРЅ РїРѕРґР°РІР°Р» Р·Р°СЏРІРєСѓ
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
   * РџРѕР»СѓС‡РёС‚СЊ РІСЃРµС… РЅР°Р·РЅР°С‡РµРЅРЅС‹С… Spot Agent РґР»СЏ Р°РєС‚Р°
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
   * РћС‚РѕР·РІР°С‚СЊ Spot Agent (С‚РѕР»СЊРєРѕ РёРЅРёС†РёР°С‚РѕСЂ)
   */
  async removeSpotAgent(
    actId: number,
    spotAgentId: number,
    initiatorId: number,
  ) {
    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ Р°РєС‚Р°
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
    });

    if (!act) {
      throw new NotFoundException(`Act with ID ${actId} not found`);
    }

    // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ Р·Р°РїСЂРѕСЃ РѕС‚ РёРЅРёС†РёР°С‚РѕСЂР°
    if (act.userId !== initiatorId) {
      throw new ForbiddenException('Only the initiator can remove spot agents');
    }

    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ spot-Р°РіРµРЅС‚Р°
    const spotAgent = await this.prisma.actSpotAgent.findUnique({
      where: { id: spotAgentId },
    });

    if (!spotAgent || spotAgent.actId !== actId) {
      throw new NotFoundException(
        `Spot agent with ID ${spotAgentId} not found`,
      );
    }

    // РЈРґР°Р»СЏРµРј spot-Р°РіРµРЅС‚Р°
    await this.prisma.actSpotAgent.delete({
      where: { id: spotAgentId },
    });

    return { message: 'Spot agent removed successfully' };
  }

  // ... СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ РєРѕРґ ActService ...

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

    // РџСЂРѕРІРµСЂРєР° РІСЂРµРјРµРЅРё С‚РѕСЂРіРѕРІ
    if (
      method !== SelectionMethods.MANUAL &&
      act.biddingTime &&
      new Date() > act.biddingTime
    ) {
      throw new BadRequestException('Bidding time has expired');
    }

    // РџСЂРѕРІРµСЂРєР°, С‡С‚Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РµС‰С‘ РЅРµ РІ СЌС‚РѕР№ СЂРѕР»Рё
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
      // Р”Р»СЏ MANUAL СЃСЂР°Р·Сѓ СЃРѕР·РґР°С‘Рј participant СЃ pending СЃС‚Р°С‚СѓСЃРѕРј
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

    // Р”Р»СЏ VOTING Рё BIDDING вЂ” СЃРѕР·РґР°С‘Рј РєР°РЅРґРёРґР°С‚СѓСЂСѓ
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
      // РќР°С…РѕРґРёРј РєР°РЅРґРёРґР°С‚Р° СЃ РЅР°РёР±РѕР»СЊС€РёРј РєРѕР»РёС‡РµСЃС‚РІРѕРј РіРѕР»РѕСЃРѕРІ
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
      // РќР°С…РѕРґРёРј РєР°РЅРґРёРґР°С‚Р° СЃ РјР°РєСЃРёРјР°Р»СЊРЅРѕР№ СЃС‚Р°РІРєРѕР№
      const topBid = await this.prisma.roleCandidate.findFirst({
        where: { actId, roleType, method: SelectionMethods.BIDDING },
        orderBy: { bidAmount: 'desc' },
      });

      if (!topBid || !topBid.bidAmount) {
        throw new BadRequestException('No valid bids for this role');
      }

      selectedUserId = topBid.userId;
    }

    // РќР°Р·РЅР°С‡Р°РµРј СЂРѕР»СЊ
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

    // РћРїС†РёРѕРЅР°Р»СЊРЅРѕ: РѕР±РЅРѕРІР»СЏРµРј СЃС‚Р°С‚СѓСЃ РєР°РЅРґРёРґР°С‚Р°
    await this.prisma.roleCandidate.updateMany({
      where: { actId, roleType, userId: selectedUserId },
      data: { status: 'approved' },
    });

    return participant;
  }

  async getCandidates(actId: number, roleType: 'hero' | 'navigator') {
    // Р’РјРµСЃС‚Рѕ orderBy СЃ _count
    const candidates = await this.prisma.roleCandidate.findMany({
      where: { actId, roleType, method: SelectionMethods.VOTING },
      include: {
        user: { select: { id: true, login: true, email: true } },
        votes: true,
        _count: { select: { votes: true } },
      },
    });

    // РЎРѕСЂС‚РёСЂСѓРµРј РІСЂСѓС‡РЅСѓСЋ РїРѕ РєРѕР»РёС‡РµСЃС‚РІСѓ РіРѕР»РѕСЃРѕРІ
    candidates.sort((a, b) => b._count.votes - a._count.votes);

    if (candidates.length === 0 || candidates[0]._count.votes === 0) {
      throw new BadRequestException('No candidates with votes for this role');
    }

    const topCandidate = candidates[0];

    return candidates;
  }
}
