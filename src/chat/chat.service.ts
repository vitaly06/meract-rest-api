import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { CreateGroupChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

const userSelect = {
  id: true,
  login: true,
  email: true,
  avatarUrl: true,
} as const;

const messageInclude = {
  sender: { select: userSelect },
  replyTo: {
    include: { sender: { select: userSelect } },
  },
  forwardedFrom: {
    include: { sender: { select: userSelect } },
  },
} as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  private formatMessage(msg: any) {
    return {
      id: msg.id,
      chatId: msg.chatId,
      text: msg.isDeleted ? null : msg.text,
      fileUrl: msg.isDeleted ? null : msg.fileUrl,
      fileType: msg.isDeleted ? null : msg.fileType,
      isDeleted: msg.isDeleted,
      createdAt: msg.createdAt,
      sender: msg.sender,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            text: msg.replyTo.isDeleted ? null : msg.replyTo.text,
            fileUrl: msg.replyTo.isDeleted ? null : msg.replyTo.fileUrl,
            fileType: msg.replyTo.fileType,
            isDeleted: msg.replyTo.isDeleted,
            sender: msg.replyTo.sender,
          }
        : null,
      forwardedFrom: msg.forwardedFrom
        ? {
            id: msg.forwardedFrom.id,
            text: msg.forwardedFrom.isDeleted ? null : msg.forwardedFrom.text,
            fileUrl: msg.forwardedFrom.isDeleted
              ? null
              : msg.forwardedFrom.fileUrl,
            fileType: msg.forwardedFrom.fileType,
            isDeleted: msg.forwardedFrom.isDeleted,
            sender: msg.forwardedFrom.sender,
          }
        : null,
    };
  }

  private async assertMember(chatId: number, userId: number) {
    const member = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!member)
      throw new ForbiddenException('You are not a member of this chat');
    return member;
  }

  private resolveFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype === 'audio/ogg' || mimetype === 'audio/webm') return 'voice';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'file';
  }

  // ─── Chat list ───────────────────────────────────────────────────────────────

  async getChats(userId: number) {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: { include: { user: { select: userSelect } } },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: userSelect } },
            },
          },
        },
      },
    });

    memberships.sort((a, b) => {
      const aTime = a.chat.messages[0]?.createdAt ?? a.chat.createdAt;
      const bTime = b.chat.messages[0]?.createdAt ?? b.chat.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return Promise.all(
      memberships.map(async (m) => {
        const chat = m.chat;
        const last = chat.messages[0] ?? null;

        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            isDeleted: false,
            senderId: { not: userId },
            createdAt: { gt: m.lastReadAt ?? new Date(0) },
          },
        });

        let partner: any = null;
        if (chat.type === 'direct') {
          partner =
            chat.members.find((mem) => mem.userId !== userId)?.user ?? null;
        }

        return {
          id: chat.id,
          type: chat.type,
          name:
            chat.type === 'direct'
              ? (partner?.login ?? partner?.email ?? 'Unknown')
              : chat.name,
          imageUrl:
            chat.type === 'direct'
              ? (partner?.avatarUrl ?? null)
              : chat.imageUrl,
          partner: chat.type === 'direct' ? partner : null,
          unreadCount,
          lastMessage: last
            ? {
                id: last.id,
                text: last.text,
                fileType: last.fileType,
                createdAt: last.createdAt,
                sender: last.sender,
              }
            : null,
          lastMessageAt: last?.createdAt ?? chat.createdAt,
        };
      }),
    );
  }

  // ─── Direct chat ─────────────────────────────────────────────────────────────

  async getOrCreateDirectChat(userId: number, otherUserId: number) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create chat with yourself');
    }
    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: userSelect,
    });
    if (!other) throw new NotFoundException('User not found');

    const existing = await this.prisma.chat.findFirst({
      where: {
        type: 'direct',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
    });

    if (existing) return { id: existing.id, type: 'direct' };

    const chat = await this.prisma.chat.create({
      data: {
        type: 'direct',
        members: { create: [{ userId }, { userId: otherUserId }] },
      },
    });
    return { id: chat.id, type: 'direct' };
  }

  // ─── Group chat ───────────────────────────────────────────────────────────────

  async createGroupChat(
    userId: number,
    dto: CreateGroupChatDto,
    file?: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;
    if (file) {
      const s3 = await this.s3.uploadFile(file);
      imageUrl = s3.url;
    }

    const allIds = [...new Set([userId, ...dto.participantIds])];
    const count = await this.prisma.user.count({
      where: { id: { in: allIds } },
    });
    if (count !== allIds.length)
      throw new NotFoundException('One or more users not found');

    const chat = await this.prisma.chat.create({
      data: {
        type: 'group',
        name: dto.name,
        imageUrl,
        members: { create: allIds.map((id) => ({ userId: id })) },
      },
      include: { members: { include: { user: { select: userSelect } } } },
    });

    return chat;
  }

  // ─── Guild chat ───────────────────────────────────────────────────────────────

  async getOrCreateGuildChat(userId: number, guildId: number) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: { members: { select: { id: true } }, chat: true },
    });
    if (!guild) throw new NotFoundException('Guild not found');

    const isMember =
      guild.ownerId === userId || guild.members.some((m) => m.id === userId);
    if (!isMember)
      throw new ForbiddenException('You are not a member of this guild');

    if (guild.chat) {
      await this.prisma.chatMember.upsert({
        where: { chatId_userId: { chatId: guild.chat.id, userId } },
        create: { chatId: guild.chat.id, userId },
        update: {},
      });
      return { id: guild.chat.id, type: 'guild', guildId };
    }

    const memberIds = [
      ...new Set([guild.ownerId, ...guild.members.map((m) => m.id)]),
    ];
    const chat = await this.prisma.chat.create({
      data: {
        type: 'guild',
        name: guild.name,
        guildId,
        members: { create: memberIds.map((id) => ({ userId: id })) },
      },
    });
    return { id: chat.id, type: 'guild', guildId };
  }

  // ─── Messages ────────────────────────────────────────────────────────────────

  async getMessages(
    chatId: number,
    userId: number,
    limit = 50,
    before?: number,
  ) {
    await this.assertMember(chatId, userId);

    const messages = await this.prisma.message.findMany({
      where: { chatId, ...(before ? { id: { lt: before } } : {}) },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    await this.prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: new Date() },
    });

    return messages.reverse().map((m) => this.formatMessage(m));
  }

  // ─── Send message ─────────────────────────────────────────────────────────────

  async sendMessage(
    chatId: number,
    userId: number,
    dto: SendMessageDto,
    file?: Express.Multer.File,
  ) {
    await this.assertMember(chatId, userId);

    if (!dto.text && !file && !dto.forwardedFromId) {
      throw new BadRequestException(
        'Message must contain text, a file, or be a forward',
      );
    }

    let fileUrl: string | null = null;
    let fileType: string | null = null;
    if (file) {
      const s3 = await this.s3.uploadFile(file);
      fileUrl = s3.url;
      fileType = this.resolveFileType(file.mimetype);
    }

    if (dto.replyToId) {
      const replied = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
      });
      if (!replied || replied.chatId !== chatId) {
        throw new BadRequestException('Replied message not found in this chat');
      }
    }

    if (dto.forwardedFromId) {
      const fwd = await this.prisma.message.findUnique({
        where: { id: dto.forwardedFromId },
        include: { chat: { include: { members: true } } },
      });
      if (!fwd) throw new NotFoundException('Forwarded message not found');
      const isMemberOfSource = fwd.chat.members.some(
        (m) => m.userId === userId,
      );
      if (!isMemberOfSource) {
        throw new ForbiddenException(
          'Cannot forward from a chat you are not a member of',
        );
      }
    }

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        text: dto.text ?? null,
        fileUrl,
        fileType,
        replyToId: dto.replyToId ?? null,
        forwardedFromId: dto.forwardedFromId ?? null,
      },
      include: messageInclude,
    });

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return this.formatMessage(message);
  }

  // ─── Delete message ───────────────────────────────────────────────────────────

  async deleteMessage(messageId: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, text: null, fileUrl: null },
    });
    return { success: true };
  }

  // ─── Add member ───────────────────────────────────────────────────────────────

  async addMember(chatId: number, userId: number, targetUserId: number) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.type === 'direct') {
      throw new BadRequestException('Cannot add members to a direct chat');
    }
    await this.assertMember(chatId, userId);

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: targetUserId } },
      create: { chatId, userId: targetUserId },
      update: {},
    });
    return { success: true };
  }

  // ─── Mark as read ─────────────────────────────────────────────────────────────

  async markAsRead(chatId: number, userId: number) {
    await this.assertMember(chatId, userId);
    await this.prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }

  // ─── Invite link ──────────────────────────────────────────────────────────────

  async generateInviteCode(chatId: number, userId: number) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.type === 'direct') {
      throw new BadRequestException(
        'Invite links are not available for direct chats',
      );
    }
    await this.assertMember(chatId, userId);

    if (chat.inviteCode) {
      return { chatId, inviteCode: chat.inviteCode };
    }

    const inviteCode = randomBytes(16).toString('hex');
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { inviteCode },
    });
    return { chatId, inviteCode };
  }

  async joinByInviteCode(code: string, userId: number) {
    const chat = await this.prisma.chat.findUnique({
      where: { inviteCode: code },
    });
    if (!chat) throw new NotFoundException('Invalid invite link');

    await this.prisma.chatMember.upsert({
      where: { chatId_userId: { chatId: chat.id, userId } },
      create: { chatId: chat.id, userId },
      update: {},
    });
    return { chatId: chat.id, type: chat.type, name: chat.name };
  }

  // ─── Media queries ────────────────────────────────────────────────────────────

  async getChatImages(
    chatId: number,
    userId: number,
    limit = 30,
    before?: number,
  ) {
    await this.assertMember(chatId, userId);
    const images = await this.prisma.message.findMany({
      where: {
        chatId,
        fileType: 'image',
        isDeleted: false,
        ...(before ? { id: { lt: before } } : {}),
      },
      include: { sender: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return images.map((m) => ({
      id: m.id,
      fileUrl: m.fileUrl,
      createdAt: m.createdAt,
      sender: m.sender,
    }));
  }

  async getChatVideos(
    chatId: number,
    userId: number,
    limit = 30,
    before?: number,
  ) {
    await this.assertMember(chatId, userId);
    const videos = await this.prisma.message.findMany({
      where: {
        chatId,
        fileType: 'video',
        isDeleted: false,
        ...(before ? { id: { lt: before } } : {}),
      },
      include: { sender: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return videos.map((m) => ({
      id: m.id,
      fileUrl: m.fileUrl,
      createdAt: m.createdAt,
      sender: m.sender,
    }));
  }

  // ─── Members list ─────────────────────────────────────────────────────────────

  async getChatMembers(chatId: number, userId: number) {
    await this.assertMember(chatId, userId);
    const members = await this.prisma.chatMember.findMany({
      where: { chatId },
      include: { user: { select: userSelect } },
      orderBy: { joinedAt: 'asc' },
    });
    return members.map((m) => ({
      userId: m.userId,
      joinedAt: m.joinedAt,
      lastReadAt: m.lastReadAt,
      user: m.user,
    }));
  }

  // ─── Legacy: Act stream chat (ChatMessage model) ──────────────────────────────

  async sendStreamMessage(
    actId: number,
    userId: number,
    dto: { message: string },
  ) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
      select: { id: true, status: true },
    });
    if (!act) throw new NotFoundException(`Stream ${actId} not found`);
    if (act.status !== 'ONLINE') {
      throw new ForbiddenException('Cannot send messages to offline stream');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (user.status === 'BLOCKED')
      throw new ForbiddenException('Blocked users cannot send messages');
    const msg = await this.prisma.chatMessage.create({
      data: { message: dto.message, userId, actId },
      include: {
        user: { select: { id: true, login: true, email: true, status: true } },
      },
    });
    return {
      id: msg.id,
      message: msg.message,
      createdAt: msg.createdAt,
      user: {
        id: msg.user.id,
        username: msg.user.login || msg.user.email,
        status: msg.user.status,
      },
    };
  }

  async getStreamMessages(actId: number, limit = 50, offset = 0) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { actId },
      include: {
        user: { select: { id: true, login: true, email: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return messages.map((m) => ({
      id: m.id,
      message: m.message,
      createdAt: m.createdAt,
      user: {
        id: m.user.id,
        username: m.user.login || m.user.email,
        status: m.user.status,
      },
    }));
  }

  async deleteStreamMessage(messageId: number, userId: number) {
    const msg = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { act: true },
    });
    if (!msg) throw new NotFoundException('Message not found');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const canDelete =
      msg.userId === userId ||
      msg.act.userId === userId ||
      ['admin', 'main admin'].includes(user?.role?.name);
    if (!canDelete)
      throw new ForbiddenException('No permission to delete this message');
    await this.prisma.chatMessage.delete({ where: { id: messageId } });
    return { message: 'Message deleted successfully' };
  }

  async getStreamMessageCount(actId: number) {
    return this.prisma.chatMessage.count({ where: { actId } });
  }
}
