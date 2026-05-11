import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ActionChargeService {
  constructor(private readonly prisma: PrismaService) {}

  async chargeIfConfigured(userId: number, actionKey: string) {
    const cost = await this.prisma.actionCost.findUnique({
      where: { actionKey },
    });

    if (!cost || !cost.isActive || cost.amount <= 0) {
      return { charged: false, amount: 0 };
    }

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true },
      });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      if (user.balance < cost.amount) {
        throw new BadRequestException(
          `Not enough balance for action ${actionKey}. Required: ${cost.amount}`,
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: cost.amount } },
      });

      await tx.transaction.create({
        data: {
          type: 'ACTION',
          amount: -cost.amount,
          userId,
          status: 'COMPLETED',
        },
      });
    });

    return { charged: true, amount: cost.amount };
  }
}

