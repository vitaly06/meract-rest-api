import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { CreateAdminRequest } from './dto/create-admin.dto';
import * as bcrypt from 'bcrypt';
import { UpdateAdminRequest } from './dto/update-admin.dto';
import { CreateLocationRangeDto } from './dto/create-location-range.dto';
import { UpdateLocationRangeDto } from './dto/update-location-range.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { MainGateway } from 'src/gateway/main.gateway';
import { ChatService } from 'src/chat/chat.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly mainGateway: MainGateway,
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {}

  async findAll() {
    return await this.prisma.user.findMany({
      where: {
        role: {
          OR: [{ name: 'admin' }, { name: 'main admin' }],
        },
      },
      include: {
        role: true,
      },
    });
  }

  async findById(id: number) {
    const checkAdmin = await this.prisma.user.findFirst({
      where: {
        AND: [
          {
            role: {
              OR: [{ name: 'admin' }, { name: 'main admin' }],
            },
          },
          {
            id,
          },
        ],
      },
    });

    if (!checkAdmin) {
      throw new NotFoundException('Admin with this id not found');
    }

    return checkAdmin;
  }

  async createAdmin(dto: CreateAdminRequest, req: RequestWithUser) {
    const { login, password, email } = { ...dto };
    const role = await this.prisma.role.findUnique({
      where: { name: 'admin' },
    });

    const checkUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ login }, { email }],
      },
    });

    if (checkUser) {
      throw new BadRequestException('this user already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await this.prisma.user.create({
      data: {
        login,
        email,
        password: hashedPassword,
        roleId: role.id,
      },
    });

    // Current admin
    const admin = await this.findById(req.user.sub);

    await this.utilsService.addRecordToActivityJournal(
      `The main administrator ${admin.login || admin.email} created the administrator ${newAdmin.login || newAdmin.email}`,
      [admin.id, newAdmin.id],
    );
  }

  async update(dto: UpdateAdminRequest, id: number, userId: number) {
    const checkAdmin = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!checkAdmin) {
      throw new NotFoundException('Admin with this id not found');
    }

    const updateData: {
      login?: string;
      email?: string;
      password?: string;
    } = {};

    if (dto.login && dto.login !== checkAdmin.login) {
      updateData.login = dto.login;
    }

    if (dto.email && dto.email !== checkAdmin.email) {
      updateData.email = dto.email;
    }

    if (dto.oldPassword && dto.newPassword) {
      const comparePasswords = await bcrypt.compare(
        dto.oldPassword,
        checkAdmin.password,
      );
      if (!comparePasswords) {
        throw new UnauthorizedException('Passwords do not match');
      }
      updateData.password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      // Current admin
      const admin = await this.findById(userId);

      await this.utilsService.addRecordToActivityJournal(
        `The main admin ${admin.login || admin.email} updated admin data for ${checkAdmin.login || checkAdmin.email}`,
        [admin.id, checkAdmin.id],
      );

      return { message: 'Admin updated successfully' };
    }

    return { message: 'No changes detected' };
  }

  async delete(id: number, userId: number) {
    const checkAdmin = await this.findById(id);

    await this.prisma.user.delete({
      where: { id },
    });

    const admin = await this.findById(userId);

    await this.utilsService.addRecordToActivityJournal(
      `The main administrator ${admin.login || admin.email} has deleted the administrator ${checkAdmin.login || checkAdmin.email}`,
      [admin.id],
    );

    return { message: 'Admin successfully removed' };
  }

  // ============================================
  // НОВЫЕ МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ СТРИМАМИ
  // ============================================

  /**
   * Получить все активные стримы
   */
  async getActiveStreams() {
    const activeActs = await this.prisma.act.findMany({
      where: {
        status: 'ONLINE',
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
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Получаем количество сообщений для каждого стрима
    const actsWithCounts = await Promise.all(
      activeActs.map(async (act) => {
        const messagesCount = await this.prisma.chatMessage.count({
          where: { actId: act.id },
        });

        return {
          ...act,
          messagesCount,
          streamerName: act.user.login || act.user.email,
          connectedUsers: this.mainGateway.getConnectedUsersCount(act.id),
        };
      }),
    );

    return actsWithCounts;
  }

  /**
   * Получить сообщения чата конкретного стрима
   */
  async getStreamChat(actId: number, limit = 100, offset = 0) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
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

    if (!act) {
      throw new NotFoundException('Стрим не найден');
    }

    const messages = await this.chatService.getMessages(actId, limit, offset);

    return {
      act: {
        id: act.id,
        title: act.title,
        status: act.status,
        streamer: act.user,
      },
      messages,
      connectedUsers: this.mainGateway.getConnectedUsersCount(actId),
    };
  }

  /**
   * Отправить предупреждение стримеру
   */
  async sendWarningToStreamer(actId: number, message: string, adminId: number) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
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

    if (!act) {
      throw new NotFoundException('Стрим не найден');
    }

    const admin = await this.findById(adminId);

    // Отправляем предупреждение в чат стрима как системное сообщение
    await this.mainGateway.sendSystemMessage(
      actId,
      `⚠️ ПРЕДУПРЕЖДЕНИЕ ОТ АДМИНИСТРАЦИИ: ${message}`,
    );

    // Логируем действие
    await this.utilsService.addRecordToActivityJournal(
      `Администратор ${admin.login || admin.email} отправил предупреждение стримеру ${act.user.login || act.user.email} в стриме "${act.title}": ${message}`,
      [admin.id, act.userId],
    );

    return {
      message: 'Предупреждение отправлено',
      actId,
      streamer: act.user,
      warning: message,
    };
  }

  /**
   * Список админов для связи (main admin видит всех admin, admin видит main admin)
   */
  async getAdminContacts(requesterId: number) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: { role: true },
    });
    if (!requester) throw new NotFoundException('Пользователь не найден');

    const isMainAdmin = requester.role.name === 'main admin';
    const isAdmin = requester.role.name === 'admin';

    if (!isMainAdmin && !isAdmin) {
      throw new BadRequestException('Доступно только администраторам');
    }

    const targetRoleName = isMainAdmin ? 'admin' : 'main admin';

    return this.prisma.user.findMany({
      where: {
        id: { not: requesterId },
        role: { name: targetRoleName },
      },
      select: { id: true, login: true, email: true, avatarUrl: true },
    });
  }

  /**
   * Открыть/создать личный чат между admin и main admin
   */
  async openChatWithAdmin(requesterId: number, targetAdminId: number) {
    const [requester, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requesterId },
        include: { role: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetAdminId },
        include: { role: true },
      }),
    ]);

    if (!requester) throw new NotFoundException('Пользователь не найден');
    if (!target) throw new NotFoundException('Администратор не найден');

    const allowedRoles = ['admin', 'main admin'];
    if (!allowedRoles.includes(requester.role.name)) {
      throw new BadRequestException('Доступно только администраторам');
    }
    if (!allowedRoles.includes(target.role.name)) {
      throw new BadRequestException(
        'Целевой пользователь не является администратором',
      );
    }

    return this.chatService.getOrCreateDirectChat(requesterId, targetAdminId);
  }

  // ============================================
  // ЗАДАЧИ (ADMIN TASKS)
  // ============================================

  private readonly taskInclude = {
    creator: {
      select: { id: true, login: true, email: true, avatarUrl: true },
    },
    assignee: {
      select: { id: true, login: true, email: true, avatarUrl: true },
    },
  } as const;

  private async checkMainAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || user.role.name !== 'main admin') {
      throw new ForbiddenException(
        'Только главный администратор может управлять задачами',
      );
    }
    return user;
  }

  /** Создать задачу и назначить admin */
  async createAdminTask(
    creatorId: number,
    dto: {
      title: string;
      description?: string;
      deadline?: string;
      assigneeId: number;
    },
  ) {
    await this.checkMainAdmin(creatorId);

    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assigneeId },
      include: { role: true },
    });
    if (!assignee) throw new NotFoundException('Администратор не найден');
    if (!['admin', 'main admin'].includes(assignee.role.name)) {
      throw new BadRequestException(
        'Задачу можно назначить только администратору',
      );
    }

    return this.prisma.adminTask.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        creatorId,
        assigneeId: dto.assigneeId,
      },
      include: this.taskInclude,
    });
  }

  /** Получить все задачи (только main admin) */
  async getAllAdminTasks(requesterId: number) {
    await this.checkMainAdmin(requesterId);
    return this.prisma.adminTask.findMany({
      include: this.taskInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Получить задачи, назначенные конкретному admin */
  async getMyAdminTasks(assigneeId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: assigneeId },
      include: { role: true },
    });
    if (!user || !['admin', 'main admin'].includes(user.role.name)) {
      throw new ForbiddenException('Доступно только администраторам');
    }
    return this.prisma.adminTask.findMany({
      where: { assigneeId },
      include: this.taskInclude,
      orderBy: [{ isDone: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** Отметить задачу выполненной / снять отметку (assignee или main admin) */
  async toggleAdminTask(taskId: number, userId: number) {
    const task = await this.prisma.adminTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Задача не найдена');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const isMainAdmin = user.role.name === 'main admin';
    const isAssignee = task.assigneeId === userId;
    if (!isMainAdmin && !isAssignee) {
      throw new ForbiddenException('Нет прав на изменение этой задачи');
    }

    const newDone = !task.isDone;
    return this.prisma.adminTask.update({
      where: { id: taskId },
      data: { isDone: newDone, doneAt: newDone ? new Date() : null },
      include: this.taskInclude,
    });
  }

  /** Удалить задачу (только main admin) */
  async deleteAdminTask(taskId: number, requesterId: number) {
    await this.checkMainAdmin(requesterId);
    const task = await this.prisma.adminTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Задача не найдена');
    await this.prisma.adminTask.delete({ where: { id: taskId } });
    return { message: 'Задача удалена' };
  }

  /**
   * Изменить импульсы (points) пользователя
   */
  async adjustPoints(userId: number, amount: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const newPoints = user.points + amount;
    if (newPoints < 0)
      throw new BadRequestException('Импульсы не могут быть отрицательными');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { points: newPoints },
      select: { id: true, login: true, email: true, points: true },
    });

    const admin = await this.findById(adminId);
    await this.utilsService.addRecordToActivityJournal(
      `Администратор ${admin.login || admin.email} изменил импульсы пользователя ${user.login || user.email}: ${amount > 0 ? '+' : ''}${amount} (было: ${user.points}, стало: ${newPoints})`,
      [admin.id, userId],
    );

    return {
      userId,
      previousPoints: user.points,
      newPoints,
      delta: amount,
      user: updated,
    };
  }

  /**
   * Изменить баланс (echo) пользователя
   */
  async adjustBalance(userId: number, amount: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const newBalance = user.balance + amount;
    if (newBalance < 0)
      throw new BadRequestException('Баланс не может быть отрицательным');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { balance: newBalance },
      select: { id: true, login: true, email: true, balance: true },
    });

    await this.prisma.transaction.create({
      data: {
        type: 'PURCHASE',
        amount,
        userId,
        status: 'COMPLETED',
      },
    });

    const admin = await this.findById(adminId);
    await this.utilsService.addRecordToActivityJournal(
      `Администратор ${admin.login || admin.email} изменил баланс пользователя ${user.login || user.email}: ${amount > 0 ? '+' : ''}${amount} echo (было: ${user.balance}, стало: ${newBalance})`,
      [admin.id, userId],
    );

    return {
      userId,
      previousBalance: user.balance,
      newBalance,
      delta: amount,
      user: updated,
    };
  }

  /**
   * Добавить лайки стриму (накрутка)
   */
  async addLikesToStream(actId: number, count: number, adminId: number) {
    const act = await this.prisma.act.findUnique({
      where: { id: actId },
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

    if (!act) {
      throw new NotFoundException('Стрим не найден');
    }

    const currentLikes = act.likes || 0;
    const newLikes = currentLikes + count;

    const updatedAct = await this.prisma.act.update({
      where: { id: actId },
      data: {
        likes: newLikes,
      },
    });

    const admin = await this.findById(adminId);

    // Логируем действие
    await this.utilsService.addRecordToActivityJournal(
      `Администратор ${admin.login || admin.email} добавил ${count} лайков стриму "${act.title}" (стример: ${act.user.login || act.user.email}). Было: ${currentLikes}, стало: ${newLikes}`,
      [admin.id, act.userId],
    );

    return {
      message: 'Лайки успешно добавлены',
      actId,
      streamer: act.user,
      addedLikes: count,
      previousLikes: currentLikes,
      currentLikes: newLikes,
    };
  }

  // ============================================
  // УПРАВЛЕНИЕ ИНТРО
  // ============================================

  /** Получить все интро */
  async getAdminIntros() {
    const baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
    const intros = await this.prisma.intro.findMany({
      include: {
        user: { select: { id: true, login: true, email: true } },
      },
      orderBy: { id: 'desc' },
    });
    return intros.map((intro) => ({
      ...intro,
      fileName: `${baseUrl}/${intro.fileName}`,
    }));
  }

  /** Загрузить интро (userId = null → глобальное, доступное всем) */
  async uploadAdminIntro(filename: string, targetUserId?: number) {
    const intro = await this.prisma.intro.create({
      data: {
        fileName: `uploads/intros/${filename}`,
        userId: targetUserId ?? null,
      },
      include: {
        user: { select: { id: true, login: true, email: true } },
      },
    });
    const baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
    return { ...intro, fileName: `${baseUrl}/${intro.fileName}` };
  }

  /** Удалить интро по id */
  async deleteAdminIntro(introId: number) {
    const intro = await this.prisma.intro.findUnique({
      where: { id: introId },
    });
    if (!intro) throw new NotFoundException('Интро не найдено');

    const filePath = path.join(process.cwd(), intro.fileName);
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // файл мог быть уже удалён
    }

    await this.prisma.intro.delete({ where: { id: introId } });
    return { message: 'Интро удалено' };
  }

  // ============================================
  // ПОЛИТИКИ
  // ============================================

  async getPolicies() {
    return this.prisma.policy.findMany({
      include: {
        updatedBy: { select: { id: true, login: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createPolicy(
    adminId: number,
    dto: {
      slug: string;
      title: string;
      content: string;
      isPublished?: boolean;
    },
  ) {
    await this.checkMainAdmin(adminId);
    const exists = await this.prisma.policy.findUnique({
      where: { slug: dto.slug },
    });
    if (exists)
      throw new BadRequestException('Политика с таким slug уже существует');

    return this.prisma.policy.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        isPublished: dto.isPublished ?? true,
        updatedById: adminId,
      },
      include: {
        updatedBy: { select: { id: true, login: true, email: true } },
      },
    });
  }

  async updatePolicy(
    adminId: number,
    policyId: number,
    dto: { title?: string; content?: string; isPublished?: boolean },
  ) {
    await this.checkMainAdmin(adminId);
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });
    if (!policy) throw new NotFoundException('Политика не найдена');

    return this.prisma.policy.update({
      where: { id: policyId },
      data: { ...dto, updatedById: adminId },
      include: {
        updatedBy: { select: { id: true, login: true, email: true } },
      },
    });
  }

  async deletePolicy(adminId: number, policyId: number) {
    await this.checkMainAdmin(adminId);
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });
    if (!policy) throw new NotFoundException('Политика не найдена');
    await this.prisma.policy.delete({ where: { id: policyId } });
    return { message: 'Политика удалена' };
  }

  // ============================================
  // СОГЛАСИЯ
  // ============================================

  async getConsents() {
    return this.prisma.consent.findMany({
      include: {
        updatedBy: { select: { id: true, login: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createConsent(
    adminId: number,
    dto: {
      slug: string;
      title: string;
      description?: string;
      isRequired?: boolean;
      version?: string;
      isActive?: boolean;
    },
  ) {
    await this.checkMainAdmin(adminId);
    const exists = await this.prisma.consent.findUnique({
      where: { slug: dto.slug },
    });
    if (exists)
      throw new BadRequestException('Согласие с таким slug уже существует');

    return this.prisma.consent.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description ?? null,
        isRequired: dto.isRequired ?? false,
        version: dto.version ?? '1.0',
        isActive: dto.isActive ?? true,
        updatedById: adminId,
      },
      include: {
        updatedBy: { select: { id: true, login: true, email: true } },
      },
    });
  }

  async updateConsent(
    adminId: number,
    consentId: number,
    dto: {
      title?: string;
      description?: string;
      isRequired?: boolean;
      version?: string;
      isActive?: boolean;
    },
  ) {
    await this.checkMainAdmin(adminId);
    const consent = await this.prisma.consent.findUnique({
      where: { id: consentId },
    });
    if (!consent) throw new NotFoundException('Согласие не найдено');

    return this.prisma.consent.update({
      where: { id: consentId },
      data: { ...dto, updatedById: adminId },
      include: {
        updatedBy: { select: { id: true, login: true, email: true } },
      },
    });
  }

  async deleteConsent(adminId: number, consentId: number) {
    await this.checkMainAdmin(adminId);
    const consent = await this.prisma.consent.findUnique({
      where: { id: consentId },
    });
    if (!consent) throw new NotFoundException('Согласие не найдено');
    await this.prisma.consent.delete({ where: { id: consentId } });
    return { message: 'Согласие удалено' };
  }

  // ============================================
  // КАТЕГОРИИ АКТОВ
  // ============================================

  /** Все категории (публично, с кол-вом актов) */
  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        _count: { select: { Act: true } },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Категория + её акты */
  async getCategoryWithActs(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        Act: {
          select: {
            id: true,
            title: true,
            status: true,
            previewFileName: true,
            scheduledAt: true,
            startedAt: true,
            user: { select: { id: true, login: true, email: true } },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });
    if (!category) throw new NotFoundException('Категория не найдена');
    return category;
  }

  /** Создать категорию (main admin) */
  async createCategory(
    adminId: number,
    dto: {
      name: string;
      description?: string;
      order?: number;
      isActive?: boolean;
    },
  ) {
    await this.checkMainAdmin(adminId);
    const exists = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });
    if (exists)
      throw new BadRequestException('Категория с таким именем уже существует');

    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /** Обновить категорию (main admin) */
  async updateCategory(
    adminId: number,
    categoryId: number,
    dto: {
      name?: string;
      description?: string;
      order?: number;
      isActive?: boolean;
    },
  ) {
    await this.checkMainAdmin(adminId);
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Категория не найдена');

    if (dto.name && dto.name !== category.name) {
      const duplicate = await this.prisma.category.findUnique({
        where: { name: dto.name },
      });
      if (duplicate)
        throw new BadRequestException(
          'Категория с таким именем уже существует',
        );
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: { ...dto },
      include: { _count: { select: { Act: true } } },
    });
  }

  /** Удалить категорию (акты не удаляются, просто отвязываются) */
  async deleteCategory(adminId: number, categoryId: number) {
    await this.checkMainAdmin(adminId);
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Категория не найдена');

    // Отвязываем все акты от этой категории
    await this.prisma.act.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    });

    await this.prisma.category.delete({ where: { id: categoryId } });
    return { message: 'Категория удалена' };
  }

  /** Назначить акт в категорию */
  async setActCategory(
    adminId: number,
    actId: number,
    categoryId: number | null,
  ) {
    await this.checkMainAdmin(adminId);

    if (categoryId !== null) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) throw new NotFoundException('Категория не найдена');
    }

    const act = await this.prisma.act.findUnique({ where: { id: actId } });
    if (!act) throw new NotFoundException('Акт не найден');

    return this.prisma.act.update({
      where: { id: actId },
      data: { categoryId },
      select: {
        id: true,
        title: true,
        status: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
    });
  }

  /** Массовое назначение актов в категорию */
  async setActsToCategory(
    adminId: number,
    categoryId: number,
    actIds: number[],
  ) {
    await this.checkMainAdmin(adminId);
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Категория не найдена');

    await this.prisma.act.updateMany({
      where: { id: { in: actIds } },
      data: { categoryId },
    });

    return {
      message: `${actIds.length} актов добавлено в категорию "${category.name}"`,
    };
  }

  /** Убрать акты из категории (categoryId → null) */
  async removeActsFromCategory(
    adminId: number,
    categoryId: number,
    actIds: number[],
  ) {
    await this.checkMainAdmin(adminId);

    await this.prisma.act.updateMany({
      where: { id: { in: actIds }, categoryId },
      data: { categoryId: null },
    });

    return { message: `${actIds.length} актов убрано из категории` };
  }

  // ============================================
  // ДИАПАЗОНЫ РАССТОЯНИЙ ДЛЯ ПОЛЗУНКА ЛОКАЦИИ
  // ============================================

  async getLocationRanges() {
    return this.prisma.locationRange.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async createLocationRange(adminId: number, dto: CreateLocationRangeDto) {
    await this.checkMainAdmin(adminId);
    return this.prisma.locationRange.create({ data: dto });
  }

  async updateLocationRange(
    adminId: number,
    rangeId: number,
    dto: UpdateLocationRangeDto,
  ) {
    await this.checkMainAdmin(adminId);
    const range = await this.prisma.locationRange.findUnique({
      where: { id: rangeId },
    });
    if (!range) throw new NotFoundException('Диапазон не найден');
    return this.prisma.locationRange.update({
      where: { id: rangeId },
      data: dto,
    });
  }

  async deleteLocationRange(adminId: number, rangeId: number) {
    await this.checkMainAdmin(adminId);
    const range = await this.prisma.locationRange.findUnique({
      where: { id: rangeId },
    });
    if (!range) throw new NotFoundException('Диапазон не найден');
    await this.prisma.locationRange.delete({ where: { id: rangeId } });
    return { message: 'Диапазон удалён' };
  }
}
