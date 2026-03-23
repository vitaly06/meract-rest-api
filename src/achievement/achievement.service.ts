import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { MainGateway } from '../gateway/main.gateway';
import { AwardAchievementDto } from './dto/award-achievement.dto';
import { AwardGuildAchievementDto } from './dto/award-guild-achievement.dto';
import { S3Service } from 'src/s3/s3.service';
import { IconPackService } from 'src/icon-pack/icon-pack.service';

@Injectable()
export class AchievementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mainGateway: MainGateway,
    private readonly s3Service: S3Service,
    private readonly iconPackService: IconPackService,
  ) {}

  async createAchievement(
    dto: CreateAchievementDto,
    userId: number,
    photo?: Express.Multer.File,
  ) {
    const checkRole = await this.isAdmin(userId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const checkAchievement = await this.prisma.achievement.findUnique({
      where: { name: dto.name },
    });

    if (checkAchievement) {
      throw new BadRequestException(
        'Достижение с таким названием уже существует',
      );
    }

    let imageUrl: string | null = null;

    if (photo) {
      // Загрузка нового файла в S3
      const s3Data = await this.s3Service.uploadFile(photo);
      imageUrl = s3Data.url;
    } else if (dto.iconPackItemId) {
      // Иконка из активного пака
      const icon = await this.iconPackService.getIconById(+dto.iconPackItemId);
      imageUrl = icon.url;
    } else {
      throw new BadRequestException(
        'Необходимо передать фото или выбрать иконку из пака (iconPackItemId)',
      );
    }

    return await this.prisma.achievement.create({
      data: {
        name: dto.name,
        imageUrl,
      },
    });
  }

  async updateAchievement(
    id: number,
    dto: CreateAchievementDto,
    userId: number,
    photo?: Express.Multer.File,
  ) {
    const checkRole = await this.isAdmin(userId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const nowAchievement = await this.prisma.achievement.findUnique({
      where: { id },
    });

    if (!nowAchievement) {
      throw new NotFoundException('Достижение не найдено');
    }

    if (dto.name && dto.name !== nowAchievement.name) {
      const duplicate = await this.prisma.achievement.findUnique({
        where: { name: dto.name },
      });
      if (duplicate) {
        throw new BadRequestException(
          'Достижение с таким названием уже существует',
        );
      }
    }

    let imageUrl: string | undefined = undefined;

    if (photo) {
      // Удаляем старую иконку из S3
      if (nowAchievement.imageUrl) {
        await this.s3Service
          .deleteFile(nowAchievement.imageUrl)
          .catch(() => null);
      }
      const s3Data = await this.s3Service.uploadFile(photo);
      imageUrl = s3Data.url;
    } else if (dto.iconPackItemId) {
      const icon = await this.iconPackService.getIconById(+dto.iconPackItemId);
      imageUrl = icon.url;
    }

    return await this.prisma.achievement.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });
  }

  async deleteAchievement(id: number, userId: number) {
    const checkRole = await this.isAdmin(userId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const checkAchievement = await this.prisma.achievement.findUnique({
      where: { id },
    });

    if (!checkAchievement) {
      throw new NotFoundException('Достижение для удаления не найдено');
    }

    return await this.prisma.achievement.delete({
      where: { id },
    });
  }

  async findAll() {
    return await this.prisma.achievement.findMany();
  }

  // Выдать достижение пользователю
  async awardAchievement(dto: AwardAchievementDto, adminId: number) {
    const checkRole = await this.isAdmin(adminId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав для выдачи достижений');
    }

    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем существование достижения
    const achievement = await this.prisma.achievement.findUnique({
      where: { id: dto.achievementId },
    });

    if (!achievement) {
      throw new NotFoundException('Достижение не найдено');
    }

    // Проверяем, не получил ли пользователь уже это достижение
    const existingAward = await this.prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: dto.userId,
          achievementId: dto.achievementId,
        },
      },
    });

    if (existingAward) {
      throw new BadRequestException('Пользователь уже имеет это достижение');
    }

    // Выдаём достижение
    const userAchievement = await this.prisma.userAchievement.create({
      data: {
        userId: dto.userId,
        achievementId: dto.achievementId,
      },
      include: {
        achievement: true,
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
    this.mainGateway.sendAchievementNotification(dto.userId, achievement);

    // Опционально: глобальное уведомление
    this.mainGateway.broadcastAchievement(
      dto.userId,
      user.login || user.email,
      achievement,
    );

    return {
      message: 'Достижение успешно выдано',
      userAchievement,
    };
  }

  // Получить все достижения пользователя
  async getUserAchievements(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return await this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: [{ isBest: 'desc' }, { awardedAt: 'desc' }],
    });
  }

  async toggleBestAchievement(userId: number, achievementId: number) {
    const ua = await this.prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
    });
    if (!ua) throw new NotFoundException('Achievement not found for this user');

    const updated = await this.prisma.userAchievement.update({
      where: { userId_achievementId: { userId, achievementId } },
      data: { isBest: !ua.isBest },
      include: { achievement: true },
    });
    return { isBest: updated.isBest };
  }

  // Отозвать достижение у пользователя
  async revokeAchievement(dto: AwardAchievementDto, adminId: number) {
    const checkRole = await this.isAdmin(adminId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав для отзыва достижений');
    }

    const userAchievement = await this.prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: dto.userId,
          achievementId: dto.achievementId,
        },
      },
    });

    if (!userAchievement) {
      throw new NotFoundException('Пользователь не имеет данного достижения');
    }

    await this.prisma.userAchievement.delete({
      where: {
        userId_achievementId: {
          userId: dto.userId,
          achievementId: dto.achievementId,
        },
      },
    });

    return { message: 'Достижение успешно отозвано' };
  }

  // ─── Guild achievements ───────────────────────────────────────────────────────

  async awardGuildAchievement(dto: AwardGuildAchievementDto, adminId: number) {
    const checkRole = await this.isAdmin(adminId);
    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав для выдачи достижений');
    }

    const guild = await this.prisma.guild.findUnique({
      where: { id: dto.guildId },
    });
    if (!guild) throw new NotFoundException('Гильдия не найдена');

    const achievement = await this.prisma.achievement.findUnique({
      where: { id: dto.achievementId },
    });
    if (!achievement) throw new NotFoundException('Достижение не найдено');

    const existing = await this.prisma.guildAchievement.findUnique({
      where: {
        guildId_achievementId: {
          guildId: dto.guildId,
          achievementId: dto.achievementId,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('Гильдия уже имеет это достижение');
    }

    const guildAchievement = await this.prisma.guildAchievement.create({
      data: {
        guildId: dto.guildId,
        achievementId: dto.achievementId,
      },
      include: {
        achievement: true,
        guild: { select: { id: true, name: true } },
      },
    });

    return { message: 'Достижение успешно выдано гильдии', guildAchievement };
  }

  async getGuildAchievements(guildId: number) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });
    if (!guild) throw new NotFoundException('Гильдия не найдена');

    return this.prisma.guildAchievement.findMany({
      where: { guildId },
      include: { achievement: true },
      orderBy: { awardedAt: 'desc' },
    });
  }

  async revokeGuildAchievement(dto: AwardGuildAchievementDto, adminId: number) {
    const checkRole = await this.isAdmin(adminId);
    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав для отзыва достижений');
    }

    const existing = await this.prisma.guildAchievement.findUnique({
      where: {
        guildId_achievementId: {
          guildId: dto.guildId,
          achievementId: dto.achievementId,
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('Гильдия не имеет данного достижения');
    }

    await this.prisma.guildAchievement.delete({
      where: {
        guildId_achievementId: {
          guildId: dto.guildId,
          achievementId: dto.achievementId,
        },
      },
    });

    return { message: 'Достижение успешно отозвано у гильдии' };
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
