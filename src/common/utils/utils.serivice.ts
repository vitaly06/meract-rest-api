import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UtilsService {
  constructor(private readonly prisma: PrismaService) {}

  async addRecordToActivityJournal(message: string, users: number[]) {
    if (users.length == 2) {
      await this.prisma.userActivity.create({
        data: {
          action: message,
          participants: {
            createMany: {
              data: [
                { userId: users[0], role: 'initiator' },
                { userId: users[1], role: 'target' },
              ],
            },
          },
        },
      });
    } else if (users.length == 1) {
      await this.prisma.userActivity.create({
        data: {
          action: message,
          participants: {
            createMany: {
              data: [{ userId: users[0], role: 'initiator' }],
            },
          },
        },
      });
    }
  }
}
