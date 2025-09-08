import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as moment from 'moment';
import { CreateStreamRequest } from './dto/create-stream.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';

@Injectable()
export class StreamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  async getStreams() {
    const result = [];
    const streams = await this.prisma.stream.findMany({
      include: {
        user: true,
        category: true,
      },
    });
    if (!streams) {
      throw new NotFoundException('No broadcasts found');
    }
    for (const stream of streams) {
      result.push({
        id: stream.id,
        name: stream.name,
        previewFileName: stream.previewFileName,
        user: stream.user.login,
        category: stream.category.name,
        categoryId: stream.category.id,
        status: stream.status,
        spectators: 'Not done',
        duration: this.formatTimeDifference(
          stream.startedAt,
          stream.endedAt || new Date().toISOString(),
        ),
      });
    }

    return result.sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  async createStream(dto: CreateStreamRequest, filename: string) {
    const { name, userId, categoryId } = { ...dto };

    const newStream = await this.prisma.stream.create({
      data: {
        name,
        userId: +userId,
        categoryId: +categoryId,
        previewFileName: filename,
      },
    });

    // // Current user
    const user = await this.prisma.user.findUnique({
      where: { id: +userId },
    });

    await this.utilsService.addRecordToActivityJournal(
      `User ${user.login || user.email} started stream: '${newStream.name}'`,
      [+userId],
    );

    return { message: 'Stream launched successfully' };
  }

  async stopStream(id: number, req: RequestWithUser) {
    const currentStream = await this.prisma.stream.findUnique({
      where: { id },
      select: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
      },
    });
    await this.prisma.stream.update({
      where: { id },
      data: {
        status: 'OFFLINE',
        endedAt: new Date().toISOString(),
      },
    });

    const currentAdmin = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
    });
    if (currentAdmin?.terminateCount) {
      await this.prisma.user.update({
        where: { id: req.user.sub },
        data: {
          terminateCount: currentAdmin.terminateCount + 1,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: req.user.sub },
        data: {
          terminateCount: 1,
        },
      });
    }

    await this.utilsService.addRecordToActivityJournal(
      `Admin ${currentAdmin.login || currentAdmin.email} stopped stream ${currentStream.user.login || currentStream.user.email}`,
      [currentAdmin.id, currentStream.user.id],
    );

    return { message: 'Stream successfully stopped' };
  }

  async getStatistic() {
    // active streams
    const activeStreams = await this.prisma.stream.count({
      where: {
        status: 'ONLINE',
      },
    });
    // terminated by admins
    const admins = await this.prisma.user.findMany({
      where: {
        role: { OR: [{ name: 'admin' }, { name: 'main admin' }] },
        terminateCount: {
          not: null,
        },
      },
      include: {
        role: true,
      },
    });

    const adminBlocked = admins.reduce((sum, elem) => {
      return sum + elem.terminateCount;
    }, 0);

    return {
      activeStreams,
      allSpectators: 'Not done',
      adminBlocked,
    };
  }

  generateToken(channel: string, roleStr: string, tokenType: string, uidStr: string, expiry: number): string {
    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appID || !appCertificate) {
      throw new Error('AGORA_APP_ID и AGORA_APP_CERTIFICATE должны быть указаны в .env');
    }

    const uid = parseInt(uidStr, 10) || 0;
    const role = roleStr.toUpperCase() === 'PUBLISHER' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expiry;

    if (tokenType === 'uid') {
      return RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channel, uid, role, privilegeExpiredTs);
    } else if (tokenType === 'userAccount') {
      return RtcTokenBuilder.buildTokenWithAccount(appID, appCertificate, channel, uid.toString(), role, privilegeExpiredTs);
    } else {
      throw new Error('Недопустимый tokenType');
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