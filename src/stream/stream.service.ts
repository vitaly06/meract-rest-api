import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as moment from 'moment';
import { CreateStreamRequest } from './dto/create-stream.dto';

@Injectable()
export class StreamService {
  constructor(private readonly prisma: PrismaService) {}

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
        spectators: 'НЕ СДЕЛАНО',
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

    return await this.prisma.stream.create({
      data: {
        name,
        userId: +userId,
        categoryId: +categoryId,
        previewFileName: filename,
      },
    });
  }

  async stopStream(id: number) {
    return await this.prisma.stream.update({
      where: { id },
      data: {
        status: 'OFFLINE',
        endedAt: new Date().toISOString(),
      },
    });
  }

  async getStatistic() {
    const activeStreams = await this.prisma.stream.count({
      where: {
        status: 'ONLINE',
      },
    });

    return {
      activeStreams,
      allSpectators: 'Не сделал',
      adminBlocked: 'Не сделал',
    };
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
