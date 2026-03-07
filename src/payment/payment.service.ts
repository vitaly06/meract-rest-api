import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransferMoneyDto } from './dto/transfer-money.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  private formatDate(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  private formatDateTime(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${d}.${m}.${y} ${h}:${min}`;
  }

  private formatAmount(amount: number): string {
    return amount >= 0 ? `+${amount}` : `${amount}`;
  }

  async transferMoney(userId: number, dto: TransferMoneyDto) {
    const recipient = await this.prisma.user.findFirst({
      where: { OR: [{ login: dto.user }, { email: dto.user }] },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    if (recipient.id === userId) {
      throw new BadRequestException('Cannot transfer money to yourself');
    }

    const sender = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!sender) {
      throw new NotFoundException('User not found');
    }

    if (sender.balance - dto.sum < 0) {
      throw new BadRequestException('Not enough money to transfer');
    }

    await this.prisma.$transaction([
      // Deduct from sender
      this.prisma.user.update({
        where: { id: userId },
        data: { balance: sender.balance - dto.sum },
      }),
      // Add to recipient
      this.prisma.user.update({
        where: { id: recipient.id },
        data: { balance: recipient.balance + dto.sum },
      }),
      // Transaction record for sender (negative)
      this.prisma.transaction.create({
        data: {
          type: 'TRANSFER',
          amount: -dto.sum,
          userId,
          counterpartId: recipient.id,
        },
      }),
      // Transaction record for recipient (positive)
      this.prisma.transaction.create({
        data: {
          type: 'TRANSFER',
          amount: dto.sum,
          userId: recipient.id,
          counterpartId: userId,
        },
      }),
    ]);

    return { message: 'Funds have been sent successfully.' };
  }

  async getMyTransactions(userId: number) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      include: {
        counterpart: { select: { login: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const formatted = transactions.map((t) => ({
      id: t.id,
      date: this.formatDate(t.createdAt),
      type: t.type === 'TRANSFER' ? 'Transfer' : 'Purchase Echo',
      counterpart:
        t.type === 'TRANSFER'
          ? (t.counterpart?.login ?? t.counterpart?.email ?? 'Unknown')
          : 'Meract shop',
      amount: this.formatAmount(t.amount),
    }));

    return {
      balance: user.balance,
      data: formatted,
    };
  }

  async getTransactionById(transactionId: number, userId: number) {
    const t = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: { select: { login: true, email: true } },
        counterpart: { select: { login: true, email: true } },
      },
    });

    if (!t) {
      throw new NotFoundException('Transaction not found');
    }

    if (t.userId !== userId) {
      throw new NotFoundException('Transaction not found');
    }

    let sender: string;
    if (t.type === 'PURCHASE') {
      sender = '@meract';
    } else if (t.amount > 0) {
      // Received — counterpart sent it
      sender = t.counterpart?.login ?? t.counterpart?.email ?? 'Unknown';
    } else {
      // Sent — current user is the sender
      sender = t.user.login ?? t.user.email;
    }

    return {
      id: t.id,
      status: t.status === 'COMPLETED' ? 'Completed' : 'Failed',
      date: this.formatDateTime(t.createdAt),
      type:
        t.type === 'TRANSFER' ? 'Transfer to user' : 'Purchasing from Meract',
      amount: this.formatAmount(t.amount),
      sender,
    };
  }
}
