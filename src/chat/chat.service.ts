import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Отправить сообщение в чат стрима
   */
  async sendMessage(actId: number, userId: number, dto: CreateMessageDto) {
    // Проверяем существование стрима
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      select: { id: true, status: true, title: true },
    });

    if (!act) {
      throw new NotFoundException(`Stream with ID ${actId} not found`);
    }

    // Проверяем, что стрим активен
    if (act.status !== 'ONLINE') {
      throw new ForbiddenException('Cannot send messages to offline stream');
    }

    // Проверяем существование пользователя и его статус
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, login: true, email: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.status === 'BLOCKED') {
      throw new ForbiddenException('Blocked users cannot send messages');
    }

    // Создаем сообщение
    const message = await this.prisma.chatMessage.create({
      data: {
        message: dto.message,
        userId,
        actId,
      },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
            status: true,
          },
        },
      },
    });

    return {
      id: message.id,
      message: message.message,
      createdAt: message.createdAt,
      user: {
        id: message.user.id,
        username: message.user.login || message.user.email,
        status: message.user.status,
      },
    };
  }

  /**
   * Получить сообщения чата для стрима
   */
  async getMessages(actId: number, limit: number = 50, offset: number = 0) {
    // Проверяем существование стрима
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      select: { id: true, title: true },
    });

    if (!act) {
      throw new NotFoundException(`Stream with ID ${actId} not found`);
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { actId },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return messages.map((message) => ({
      id: message.id,
      message: message.message,
      createdAt: message.createdAt,
      user: {
        id: message.user.id,
        username: message.user.login || message.user.email,
        status: message.user.status,
      },
    }));
  }

  /**
   * Удалить сообщение (только для админов или автора сообщения)
   */
  async deleteMessage(messageId: number, userId: number) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        user: true,
        act: true,
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!currentUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Проверяем права: автор сообщения, автор стрима или админ
    const canDelete =
      message.userId === userId || // автор сообщения
      message.act.userId === userId || // автор стрима
      ['admin', 'main admin'].includes(currentUser.role?.name); // админ

    if (!canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete this message',
      );
    }

    await this.prisma.chatMessage.delete({
      where: { id: messageId },
    });

    return { message: 'Message deleted successfully' };
  }

  /**
   * Получить количество сообщений в чате стрима
   */
  async getMessageCount(actId: number): Promise<number> {
    return await this.prisma.chatMessage.count({
      where: { actId },
    });
  }
}
