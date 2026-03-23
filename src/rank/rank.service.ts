import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRankDto } from './dto/create-rank.dto';
import { AwardRankDto } from './dto/award-rank.dto';
import { MainGateway } from '../gateway/main.gateway';
import { S3Service } from 'src/s3/s3.service';
import { IconPackService } from 'src/icon-pack/icon-pack.service';

@Injectable()
export class RankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mainGateway: MainGateway,
    private readonly s3Service: S3Service,
    private readonly iconPackService: IconPackService,
  ) {}

  async createRank(
    dto: CreateRankDto,
    userId: number,
    photo?: Express.Multer.File,
  ) {
    const checkRole = await this.isAdmin(userId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const checkRank = await this.prisma.rank.findUnique({
      where: { name: dto.name },
    });

    if (checkRank) {
      throw new BadRequestException('Ранг с таким названием уже существует');
    }

    let imageUrl: string | null = null;

    if (photo) {
      const s3Data = await this.s3Service.uploadFile(photo);
      imageUrl = s3Data.url;
    } else if (dto.iconPackItemId) {
      const icon = await this.iconPackService.getIconById(+dto.iconPackItemId);
      imageUrl = icon.url;
    } else {
      throw new BadRequestException(
        'Необходимо передать фото или выбрать иконку из пака (iconPackItemId)',
      );
    }

    return await this.prisma.rank.create({
      data: {
        name: dto.name,
        imageUrl,
      },
    });
  }

  async updateRank(id: number, dto: CreateRankDto, userId: number) {
    const checkRole = await this.isAdmin(userId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const nowRank = await this.prisma.rank.findUnique({
      where: { id },
    });

    const checkRank = await this.prisma.rank.findUnique({
      where: { name: dto.name },
    });

    if (checkRank && nowRank.name != dto.name) {
      throw new BadRequestException('Ранг с таким названием уже существует');
    }

    return await this.prisma.rank.update({
      where: {
        id,
      },
      data: {
        name: dto.name,
      },
    });
  }

  async deleteRank(id: number, userId: number) {
    const checkRole = await this.isAdmin(userId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const checkRank = await this.prisma.rank.findUnique({
      where: { id },
    });

    if (!checkRank) {
      throw new NotFoundException('Ранг для удаления не найдено');
    }

    return await this.prisma.rank.delete({
      where: { id },
    });
  }

  async findAll() {
    return await this.prisma.rank.findMany();
  }

  // Выдать достижение пользователю
  async awardRank(dto: AwardRankDto, adminId: number) {
    const checkRole = await this.isAdmin(adminId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав для выдачи ранга');
    }

    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const rank = await this.prisma.rank.findUnique({
      where: { id: dto.rankId },
    });

    if (!rank) {
      throw new NotFoundException('Ранг не найден');
    }

    const existingAward = await this.prisma.userRank.findUnique({
      where: {
        userId_rankId: {
          userId: dto.userId,
          rankId: dto.rankId,
        },
      },
    });

    if (existingAward) {
      throw new BadRequestException('Пользователь уже имеет этот ранг');
    }

    // Выдаём достижение
    const userRank = await this.prisma.userRank.create({
      data: {
        userId: dto.userId,
        rankId: dto.rankId,
      },
      include: {
        rank: true,
        user: {
          select: {
            id: true,
            login: true,
            email: true,
          },
        },
      },
    });

    // Отправляем уведомление через WebSocket
    this.mainGateway.sendRankNotification(dto.userId, rank);

    // Опционально: глобальное уведомление
    this.mainGateway.broadcastRank(dto.userId, user.login || user.email, rank);

    return {
      message: 'Ранг успешно выдан',
      userRank,
    };
  }

  // Получить все ранги пользователя
  async getUserRanks(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return await this.prisma.userRank.findMany({
      where: { userId },
      include: {
        rank: true,
      },
    });
  }

  // Отозвать достижение у пользователя
  async revokeRank(dto: AwardRankDto, adminId: number) {
    const checkRole = await this.isAdmin(adminId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав для отзыва достижений');
    }

    const userRank = await this.prisma.userRank.findUnique({
      where: {
        userId_rankId: {
          userId: dto.userId,
          rankId: dto.rankId,
        },
      },
    });

    if (!userRank) {
      throw new NotFoundException('Пользователь не имеет данного ранга');
    }

    await this.prisma.userRank.delete({
      where: {
        userId_rankId: {
          userId: dto.userId,
          rankId: dto.rankId,
        },
      },
    });

    return { message: 'Ранг успешно отозван' };
  }

  // Таблица лидеров по очкам, сгруппированная по роли в актах
  async getLeaderboard(role: 'initiator' | 'navigator' | 'hero', limit = 50) {
    let users: any[];

    if (role === 'initiator') {
      // Пользователи, которые хоть раз были инициатором акта
      users = await this.prisma.user.findMany({
        where: { Act: { some: {} } },
        select: {
          id: true,
          login: true,
          email: true,
          avatarUrl: true,
          points: true,
          _count: { select: { Act: true } },
        },
        orderBy: { points: 'desc' },
        take: limit,
      });

      return users.map((u, i) => ({
        rank: i + 1,
        userId: u.id,
        name: u.login || u.email,
        avatarUrl: u.avatarUrl,
        points: u.points,
        actsCount: u._count.Act,
      }));
    } else {
      // Для hero / navigator — через ActParticipant
      users = await this.prisma.user.findMany({
        where: {
          ActParticipants: { some: { role } },
        },
        select: {
          id: true,
          login: true,
          email: true,
          avatarUrl: true,
          points: true,
          _count: {
            select: {
              ActParticipants: true,
            },
          },
        },
        orderBy: { points: 'desc' },
        take: limit,
      });

      // Считаем только акты с нужной ролью
      const withRoleCount = await Promise.all(
        users.map(async (u) => {
          const cnt = await this.prisma.actParticipant.count({
            where: { userId: u.id, role },
          });
          return {
            rank: 0,
            userId: u.id,
            name: u.login || u.email,
            avatarUrl: u.avatarUrl,
            points: u.points,
            actsCount: cnt,
          };
        }),
      );

      return withRoleCount.map((u, i) => ({ ...u, rank: i + 1 }));
    }
  }

  private async isAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    return user.role.name == 'admin' || user.role.name == 'main admin'
      ? true
      : false;
  }
}
