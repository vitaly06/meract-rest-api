import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { MainGateway } from 'src/gateway/main.gateway';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MainGateway))
    private readonly mainGateway: MainGateway,
  ) {}

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

  async sendMessage(ticketId: number, userId: number, dto: CreateMessageDto, file?: Express.Multer.File) {
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

    let fileUrl: string | null = null;
    let fileType: string | null = null;

    if (file) {
      const filename = `${Date.now()}-${file.originalname}`;
      const uploadPath = `uploads/tickets/${filename}`;
      // Save file to disk
      const fs = require('fs');
      const dir = 'uploads/tickets';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(uploadPath, file.buffer);
      fileUrl = `/${uploadPath}`;
      if (file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        fileType = 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        fileType = 'audio';
      } else {
        fileType = 'file';
      }
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        text: dto.message,
        userId,
        ticketId,
        fileUrl,
        fileType,
      },
      include: {
        user: { select: { id: true, login: true, email: true, status: true } },
      },
    });

    const result = {
      id: message.id,
      text: message.text,
      fileUrl: message.fileUrl,
      fileType: message.fileType,
      createdAt: message.createdAt,
      user: {
        id: message.user.id,
        username: message.user.login || message.user.email,
        isadmin: isAdmin,
      },
    };

    // Real-time: broadcast to ticket room
    this.mainGateway.sendTicketMessage(ticketId, result);

    return result;
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

  async getTicketById(ticketId: number, userId: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, login: true, email: true, avatarUrl: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, login: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const isAdmin = await this.isAdmin(userId);
    if (ticket.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return {
      ...ticket,
      messages: ticket.messages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        createdAt: msg.createdAt,
        user: {
          id: msg.user.id,
          username: msg.user.login || msg.user.email,
          isadmin: ['admin', 'main admin'].includes(msg.user.role?.name),
        },
      })),
    };
  }

  async setTicketStatus(
    ticketId: number,
    adminId: number,
    status: TicketStatus,
  ) {
    const isAdmin = await this.isAdmin(adminId);
    if (!isAdmin) throw new ForbiddenException('Access denied');

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
      include: {
        user: { select: { id: true, login: true, email: true } },
      },
    });

    // Notify the room about status change
    this.mainGateway.sendTicketStatusChange(ticketId, status);

    return updated;
  }

  private async isAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    return !!user && ['admin', 'main admin'].includes(user.role?.name);
  }
}
