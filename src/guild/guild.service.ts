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

@Injectable()
export class GuildService {
  baseUrl: string;
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsSerivce: UtilsService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
  }

  async createGuild(
    dto: CreateGuildRequest,
    req: RequestWithUser,
    fileName?: string,
  ) {
    const { name, description } = { ...dto };

    const checkGuild = await this.prisma.guild.findUnique({
      where: { name },
    });

    if (checkGuild) {
      throw new BadRequestException('A guild with this name already exists');
    }

    const guild = await this.prisma.guild.create({
      data: {
        name,
        description,
        logoFileName: fileName,
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
    const guilds = await this.prisma.guild.findMany();

    return guilds.map((guild) => {
      return {
        ...guild,
        logoFileName: `${this.baseUrl}/uploads/guilds/${guild.logoFileName}`,
      };
    });
  }

  async findById(guildId: number) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: true,
      },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    return {
      ...guild,
      logoFileName: guild.logoFileName
        ? `${this.baseUrl}/uploads/guilds/${guild.logoFileName}`
        : null,
    };
  }

  async updateGuild(id: number, dto: UpdateGuildRequest, fileName?: string) {
    const guild = await this.prisma.guild.findFirst({
      where: {
        id,
      },
    });

    let logoFileName = guild.logoFileName;
    if (fileName) {
      logoFileName = fileName;
    }
    await this.prisma.guild.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        ...(logoFileName && { logoFileName }),
      },
    });

    return { message: 'Guild successfully updated' };
  }

  async inviteUser(userId: number, guildId: number) {
    const checkUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        Guild: true,
      },
    });
    if (!checkUser) {
      throw new NotFoundException('User with this id not found');
    }

    // Проверяем, что пользователь не состоит в другой гильдии
    if (checkUser.guildId && checkUser.guildId !== guildId) {
      const currentGuild = checkUser.Guild;
      if (currentGuild.ownerId === userId) {
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
          connect: { id: userId },
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
}
