import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: number, dto: CreateTicketDto) {
    return await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        img: dto.img || null,
        userId: userId,
      },
    });
  }

  async sendMessage(ticketId: number, userId: number, dto: CreateMessageDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const isAdmin = await this.isAdmin(userId);
    if (ticket.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        text: dto.message,
        userId,
        ticketId,
      },
      include: {
        user: { select: { id: true, login: true, email: true, status: true } },
      },
    });

    return {
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      user: {
        id: message.user.id,
        username: message.user.login || message.user.email,
        isadmin: isAdmin,
      },
    };
  }

  async getAllTickets(userId: number) {
    const isAdmin = await this.isAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return await this.prisma.ticket.findMany({
      include: {
        user: { select: { id: true, login: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(ticketId: number, userId: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isAdmin = await this.isAdmin(userId);
    if (ticket.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    const messages = await this.prisma.ticketMessage.findMany({
      where: { ticketId },
      include: {
        user: {
          select: { id: true, login: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      createdAt: msg.createdAt,
      user: {
        id: msg.user.id,
        username: msg.user.login || msg.user.email,
        isadmin: ['admin', 'main admin'].includes(msg.user.role?.name),
      },
    }));
  }

  async getMyTickets(userId: number) {
    return await this.prisma.ticket.findMany({
      where: { userId },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async isAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    return !!user && ['admin', 'main admin'].includes(user.role?.name);
  }
}
