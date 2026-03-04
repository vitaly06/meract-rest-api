import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CreateNotificationPayload {
  userId: number;
  type: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(payload: CreateNotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl ?? null,
        metadata: payload.metadata ?? undefined,
      },
    });

    // Fire-and-forget: gateway listens to this event and sends WS push
    this.eventEmitter.emit('notification.created', notification);

    return notification;
  }

  /** Send to multiple recipients at once (e.g. all chat members) */
  async createMany(payloads: CreateNotificationPayload[]) {
    await Promise.all(payloads.map((p) => this.create(p)));
  }

  async getForUser(userId: number, limit = 30, before?: number) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(before ? { id: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return notifications;
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(notificationId: number, userId: number) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async deleteNotification(notificationId: number, userId: number) {
    await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return { success: true };
  }
}
