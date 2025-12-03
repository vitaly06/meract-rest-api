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

@Injectable()
export class AchievementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mainGateway: MainGateway,
  ) {}

  async createAchievement(dto: CreateAchievementDto, userId: number) {
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

    return await this.prisma.achievement.create({
      data: {
        name: dto.name,
      },
    });
  }

  async updateAchievement(
    id: number,
    dto: CreateAchievementDto,
    userId: number,
  ) {
    const checkRole = await this.isAdmin(userId);

    if (!checkRole) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const nowAchievement = await this.prisma.achievement.findUnique({
      where: { id },
    });

    const checkAchievement = await this.prisma.achievement.findUnique({
      where: { name: dto.name },
    });

    if (checkAchievement && nowAchievement.name != dto.name) {
      throw new BadRequestException(
        'Достижение с таким названием уже существует',
      );
    }

    return await this.prisma.achievement.update({
      where: {
        id,
      },
      data: {
        name: dto.name,
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
      orderBy: {
        awardedAt: 'desc',
      },
    });
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
