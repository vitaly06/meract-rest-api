import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGuildRequest } from './dto/create-guild.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { UpdateGuildRequest } from './dto/update-guild.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';
import { ConfigService } from '@nestjs/config';
import { SendGuildMessageDto } from './dto/send-guild-message.dto';
import { S3Service } from 'src/s3/s3.service';

@Injectable()
export class GuildService {
  baseUrl: string;
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsSerivce: UtilsService,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    this.baseUrl = configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
  }

  async createGuild(
    dto: CreateGuildRequest,
    req: RequestWithUser,
    file: Express.Multer.File | null,
    cover: Express.Multer.File | null,
  ) {
    const { name, description, tags } = { ...dto };

    const checkGuild = await this.prisma.guild.findUnique({
      where: { name },
    });

    let photoS3Data = null;
    let coverS3Data = null;

    if (file) {
      photoS3Data = await this.s3Service.uploadFile(file);
    }

    if (cover) {
      coverS3Data = await this.s3Service.uploadFile(cover);
    }

    if (checkGuild) {
      throw new BadRequestException('A guild with this name already exists');
    }

    const guild = await this.prisma.guild.create({
      data: {
        name,
        description,
        tags: tags ?? [],
        logoFileName: photoS3Data?.url || null,
        coverFileName: coverS3Data?.url || null,
        ownerId: req.user.sub,
      },
    });

    // current admin
    const currentAdmin = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
    });
    await this.utilsSerivce.addRecordToActivityJournal(
      `Admin ${currentAdmin.login || currentAdmin.email} created guild: '${guild.name}'`,
      [currentAdmin.id],
    );

    return { message: 'The guild has been successfully created.' };
  }

  async findAll() {
    const guilds = await this.prisma.guild.findMany({
      include: {
        members: { select: { id: true } },
        achievements: {
          include: { achievement: true },
          orderBy: { awardedAt: 'desc' },
        },
        _count: { select: { members: true } },
      },
    });

    // Подсчёт актов для каждого владельца + участников гильдии
    const result = await Promise.all(
      guilds.map(async (guild) => {
        const memberIds = guild.members.map((m) => m.id);
        const actsCount = await this.prisma.act.count({
          where: { userId: { in: memberIds } },
        });

        return {
          id: guild.id,
          name: guild.name,
          description: guild.description,
          logoFileName: guild.logoFileName,
          coverFileName: guild.coverFileName,
          tags: guild.tags,
          ownerId: guild.ownerId,
          membersCount: guild._count.members,
          actsCount,
          achievements: guild.achievements.map((ga) => ({
            id: ga.achievement.id,
            name: ga.achievement.name,
            imageUrl: ga.achievement.imageUrl,
            awardedAt: ga.awardedAt,
          })),
          createdAt: guild.createdAt,
          updatedAt: guild.updatedAt,
        };
      }),
    );

    return result;
  }

  async findById(guildId: number) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: {
          select: { id: true, login: true, email: true, avatarUrl: true },
        },
        achievements: {
          include: { achievement: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    const memberIds = guild.members.map((m) => m.id);
    const acts = await this.prisma.act.findMany({
      where: { userId: { in: memberIds } },
      select: {
        id: true,
        title: true,
        previewFileName: true,
        status: true,
        startedAt: true,
        endedAt: true,
        user: { select: { id: true, login: true, email: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const allAchievements = guild.achievements
      .sort((a, b) => a.order - b.order)
      .map((ga) => ({
        id: ga.achievement.id,
        name: ga.achievement.name,
        imageUrl: ga.achievement.imageUrl,
        awardedAt: ga.awardedAt,
        order: ga.order,
        featured: ga.featured,
      }));

    const featuredAchievements = allAchievements.filter((a) => a.featured);

    return {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      logoFileName: guild.logoFileName,
      coverFileName: guild.coverFileName,
      tags: guild.tags,
      ownerId: guild.ownerId,
      members: guild.members,
      membersCount: guild.members.length,
      acts: acts.map((act) => ({
        id: act.id,
        name: act.title || '',
        previewFileName: act.previewFileName,
        status: act.status || '',
        startedAt: act.startedAt,
        endedAt: act.endedAt,
        user: act.user.login || act.user.email,
        category: act.category?.name || '',
        categoryId: act.category?.id,
      })),
      actsCount: acts.length,
      achievements: allAchievements,
      featuredAchievements,
      createdAt: guild.createdAt,
      updatedAt: guild.updatedAt,
    };
  }

  async updateGuild(
    id: number,
    dto: UpdateGuildRequest,
    photo: Express.Multer.File | null,
    cover: Express.Multer.File | null,
  ) {
    const guild = await this.prisma.guild.findFirst({
      where: { id },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    let logoFileName = guild.logoFileName;
    let coverFileName = guild.coverFileName;

    if (photo) {
      const photoS3Data = await this.s3Service.uploadFile(photo);
      logoFileName = photoS3Data?.url || logoFileName;
    }

    if (cover) {
      const coverS3Data = await this.s3Service.uploadFile(cover);
      coverFileName = coverS3Data?.url || coverFileName;
    }

    const tags = dto.tags !== undefined ? dto.tags : guild.tags;

    await this.prisma.guild.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        tags,
        logoFileName,
        coverFileName,
      },
    });

    return { message: 'Guild successfully updated' };
  }

  async inviteUser(user: string, guildId: number) {
    const checkUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: user }, { login: user }] },
      include: {
        Guild: true,
      },
    });
    if (!checkUser) {
      throw new NotFoundException('User not found');
    }

    // Проверяем, что пользователь не состоит в другой гильдии
    if (checkUser.guildId && checkUser.guildId !== guildId) {
      const currentGuild = checkUser?.Guild;

      if (currentGuild && currentGuild.ownerId === checkUser.id) {
        throw new BadRequestException(
          'User is the owner of another guild and cannot be invited',
        );
      }
      throw new BadRequestException(
        `User is already a member of guild "${currentGuild.name}"`,
      );
    }

    await this.prisma.guild.update({
      where: { id: guildId },
      data: {
        members: {
          connect: { id: checkUser.id },
        },
      },
    });

    return { message: 'User successfully added to guild' };
  }

  async kickOutUser(userId: number, guildId: number) {
    const checkUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!checkUser) {
      throw new NotFoundException('User with this id not found');
    }

    await this.prisma.guild.update({
      where: { id: guildId },
      data: {
        members: {
          disconnect: { id: userId },
        },
      },
    });

    return { message: 'User successfully removed from guild' };
  }

  async deleteGuild(guildId: number, req: RequestWithUser) {
    const checkGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });
    if (!checkGuild) {
      throw new NotFoundException('Guild with this id not found');
    }
    await this.prisma.guild.delete({
      where: { id: guildId },
    });

    // current admin
    const currentAdmin = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
    });
    await this.utilsSerivce.addRecordToActivityJournal(
      `Admin ${currentAdmin.login || currentAdmin.email} deleted guild: '${checkGuild.name}'`,
      [currentAdmin.id],
    );

    return { message: 'Guild successfully deleted' };
  }

  async getMyGuild(userId: number) {
    const guild = await this.prisma.guild.findFirst({
      where: {
        members: {
          some: {
            id: userId,
          },
        },
      },
    });

    if (!guild) {
      throw new NotFoundException('Пользователь не состоит в гильдии');
    }

    return {
      ...guild,
      logoFileName: guild.logoFileName
        ? `${this.baseUrl}/uploads/guilds/${guild.logoFileName}`
        : null,
    };
  }

  async isUserMemberOfGuild(userId: number, guildId: number): Promise<boolean> {
    // Проверяем, является ли пользователь владельцем гильдии
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerId: true },
    });

    if (guild?.ownerId === userId) {
      return true;
    }

    // Проверяем, является ли пользователь участником гильдии
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { guildId: true },
    });

    return user?.guildId === guildId;
  }

  async getGuildMessages(
    guildId: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    const messages = await this.prisma.guildChatMessage.findMany({
      where: { guildId },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return messages.reverse();
  }

  async sendGuildMessage(
    guildId: number,
    userId: number,
    dto: SendGuildMessageDto,
  ) {
    // Проверяем существование гильдии
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    // Проверяем, что пользователь является членом гильдии
    const isMember = await this.isUserMemberOfGuild(userId, guildId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this guild');
    }

    // Создаем сообщение
    const message = await this.prisma.guildChatMessage.create({
      data: {
        message: dto.message,
        userId,
        guildId,
      },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
      },
    });

    return message;
  }

  async deleteGuildMessage(messageId: number, userId: number) {
    const message = await this.prisma.guildChatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Проверяем, что пользователь является автором сообщения
    if (message.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.guildChatMessage.delete({
      where: { id: messageId },
    });

    return { message: 'Message successfully deleted' };
  }

  async submitJoinRequest(guildId: number, userId: number, message?: string) {
    // Проверяем, существует ли гильдия
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: { members: true },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    // Проверяем, не является ли пользователь уже членом гильдии
    const isMember = guild.members.some((member) => member.id === userId);
    if (isMember) {
      throw new BadRequestException('You are already a member of this guild');
    }

    // Проверяем, нет ли уже заявки
    const existingRequest = await this.prisma.guildJoinRequest.findUnique({
      where: {
        guildId_userId: { guildId, userId },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new BadRequestException(
          'You already have a pending request to join this guild',
        );
      }
      if (existingRequest.status === 'rejected') {
        // Обновляем отклонённую заявку на новую
        await this.prisma.guildJoinRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'pending', message },
        });
        return { message: 'Join request resubmitted successfully' };
      }
    }

    // Создаём новую заявку
    await this.prisma.guildJoinRequest.create({
      data: {
        guildId,
        userId,
        message,
      },
    });

    return { message: 'Join request submitted successfully' };
  }

  async getJoinRequests(guildId: number, userId: number) {
    // Проверяем, что гильдия существует и пользователь - владелец
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    if (guild.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the guild owner can view join requests',
      );
    }

    const requests = await this.prisma.guildJoinRequest.findMany({
      where: { guildId, status: 'pending' },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  async handleJoinRequest(
    requestId: number,
    userId: number,
    action: 'approved' | 'rejected',
  ) {
    // Находим заявку
    const request = await this.prisma.guildJoinRequest.findUnique({
      where: { id: requestId },
      include: { guild: true },
    });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    // Проверяем, что пользователь - владелец гильдии
    if (request.guild.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the guild owner can approve or reject requests',
      );
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This request has already been processed');
    }

    // Обновляем статус заявки
    await this.prisma.guildJoinRequest.update({
      where: { id: requestId },
      data: { status: action },
    });

    // Если одобрено - добавляем пользователя в гильдию
    if (action === 'approved') {
      await this.prisma.guild.update({
        where: { id: request.guildId },
        data: {
          members: {
            connect: { id: request.userId },
          },
        },
      });

      return { message: 'User has been added to the guild' };
    }

    return { message: 'Join request has been rejected' };
  }

  private async assertGuildAdminOrOwner(guildId: number, userId: number) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });
    if (!guild) throw new NotFoundException('Guild not found');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const isAdmin = user?.role?.name === 'admin';
    if (guild.ownerId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Only the guild owner or admin can manage achievements',
      );
    }
    return guild;
  }

  async reorderAchievements(
    guildId: number,
    userId: number,
    items: { achievementId: number; order: number }[],
  ) {
    await this.assertGuildAdminOrOwner(guildId, userId);

    await Promise.all(
      items.map((item) =>
        this.prisma.guildAchievement.update({
          where: {
            guildId_achievementId: {
              guildId,
              achievementId: item.achievementId,
            },
          },
          data: { order: item.order },
        }),
      ),
    );

    return { message: 'Achievements reordered' };
  }

  async toggleFeaturedAchievement(
    guildId: number,
    achievementId: number,
    userId: number,
    featured: boolean,
  ) {
    await this.assertGuildAdminOrOwner(guildId, userId);

    await this.prisma.guildAchievement.update({
      where: {
        guildId_achievementId: { guildId, achievementId },
      },
      data: { featured },
    });

    return {
      message: featured
        ? 'Achievement marked as featured'
        : 'Achievement unmarked from featured',
    };
  }
}
