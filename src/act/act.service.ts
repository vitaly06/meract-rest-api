import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as moment from 'moment';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import { CreateActRequest } from './dto/create-act.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';

@Injectable()
export class ActService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  async createAct(dto: CreateActRequest, filename?: string) {
    const {
      title,
      sequel,
      type,
      format,
      heroMethods,
      navigatorMethods,
      biddingTime,
      userId,
    } = dto;

    // Проверка существования пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: +userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // // Проверка существования категории
    // const category = await this.prisma.category.findUnique({
    //   where: { id: +categoryId },
    // });
    // if (!category) {
    //   throw new NotFoundException(`Category with ID ${categoryId} not found`);
    // }

    try {
      const newStream = await this.prisma.act.create({
        data: {
          title,
          sequel: sequel || null,
          type,
          format,
          heroMethods,
          navigatorMethods,
          biddingTime,
          userId: +userId,
          // categoryId: +categoryId,
          previewFileName: filename || null,
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
      previewFileName: stream.previewFileName,
      user: stream.user.login || stream.user.email,
      category: stream.category?.name || '',
      categoryId: stream.category?.id,
      status: stream.status || '',
      spectators: 'Not implemented', // Замените, если есть реализация
      duration: this.formatTimeDifference(
        stream.startedAt,
        stream.endedAt || new Date(),
      ),
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
          status: 'OFFLINE',
          endedAt: new Date(),
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
}
