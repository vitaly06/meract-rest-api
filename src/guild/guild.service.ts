import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGuildRequest } from './dto/create-guild.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { UpdateGuildRequest } from './dto/update-guild.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';

@Injectable()
export class GuildService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsSerivce: UtilsService,
  ) {}

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
    return await this.prisma.guild.findMany();
  }

  async findById(guildId: number) {
    return await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: true,
      },
    });
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
    });
    if (!checkUser) {
      throw new NotFoundException('User with this id not found');
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
}
