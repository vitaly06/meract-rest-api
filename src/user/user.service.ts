import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  async findById(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User with this id not found');
    }
    return user;
  }

  async findByLogin(login: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { login },
    });
    if (!user) {
      throw new NotFoundException('User with this login not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async create(userData: {
    login: string;
    email: string;
    firstName?: string;
    lastName?: string;
    password: string;
  }): Promise<User> {
    return this.prisma.user.create({ data: userData });
  }

  async getAllUsers() {
    const results = [];
    let users = await this.prisma.user.findMany({
      select: {
        id: true,
        login: true,
        email: true,
        status: true,
        warningCount: true,
        Stream: true,
        followers: true,
        role: true,
      },
    });
    users = users.filter((elem) => {
      return elem.role.name == 'user';
    });

    for (const user of users) {
      results.push({
        id: user.id,
        login: user.login,
        email: user.email,
        status: user.status,
        lastActivity: 'Not done',
        warnings: user.warningCount,
        streams: user.Stream.length,
        followers: user.followers.length,
      });
    }
    return results.sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  async issueWarning(userId: number, req: RequestWithUser) {
    const checkUser = await this.findById(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'WARNED',
        warningCount: checkUser.warningCount + 1,
      },
    });
    // Current admin
    const admin = await this.findById(req.user.sub);

    await this.utilsService.addRecordToActivityJournal(
      `Admin ${admin.login || admin.email} issued a warning to user ${checkUser.login || checkUser.email}`,
      [admin.id, checkUser.id],
    );

    return { message: 'Warning issued successfully' };
  }

  async blockUser(userId: number, req: RequestWithUser) {
    const checkUser = await this.findById(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'BLOCKED',
      },
    });

    // Current admin
    const admin = await this.findById(req.user.sub);

    await this.utilsService.addRecordToActivityJournal(
      `Admin ${admin.login || admin.email} has blocked user ${checkUser.login || checkUser.email}`,
      [admin.id, checkUser.id],
    );

    return { message: 'User successfully blocked' };
  }

  async unblockUser(userId: number, req: RequestWithUser) {
    const checkUser = await this.findById(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
      },
    });

    // Current admin
    const admin = await this.findById(req.user.sub);

    await this.utilsService.addRecordToActivityJournal(
      `Admin ${admin.login || admin.email} has unblocked user ${checkUser.login || checkUser.email}`,
      [admin.id, checkUser.id],
    );

    return { message: 'User successfully unblocked' };
  }

  async deleteUser(userId: number, req: RequestWithUser) {
    const checkUser = await this.findById(userId);

    await this.prisma.user.delete({
      where: { id: userId },
    });

    // Current admin
    const admin = await this.findById(req.user.sub);

    await this.utilsService.addRecordToActivityJournal(
      `Admin ${admin.login || admin.email} has deleted user ${checkUser.login || checkUser.email}`,
      [admin.id],
    );

    return { message: 'User successfully deleted' };
  }

  async getStatisticBlocks() {
    const activeUsers = await this.prisma.user.count({
      where: {
        status: {
          not: 'BLOCKED',
        },
      },
    });

    const activeStreams = await this.prisma.stream.count({
      where: {
        status: {
          not: 'OFFLINE',
        },
      },
    });

    const activeGuilds = await this.prisma.guild.count();

    return { activeUsers, activeStreams, activeGuilds };
  }

  async getActivityLogs() {
    const result = [];
    const logs = await this.prisma.userActivity.findMany({
      select: {
        id: true,
        action: true,
        createdAt: true,
      },
    });

    for (const log of logs) {
      result.push({
        id: log.id,
        action: log.action,
        timeAgo: this.timeAgo(log.createdAt),
      });
    }

    return result;
  }

  async getActivityLogsForUser(userId: number) {
    const result = [];
    const activities = await this.prisma.userActivityParticipants.findMany({
      where: { userId },
      include: { activity: true },
    });

    for (const log of activities) {
      result.push({
        id: log.activity.id,
        action: log.activity.action,
        timeAgo: this.timeAgo(log.activity.createdAt),
      });
    }

    return result;
  }

  async allUsersForGuild() {
    return await this.prisma.user.findMany({
      select: {
        id: true,
        login: true,
        email: true,
      },
    });
  }

  private timeAgo(
    date: Date | string | number,
    now: Date = new Date(),
  ): string {
    const pastDate =
      typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    const diffMs = now.getTime() - pastDate.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHrs = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHrs / 24);
    const diffWeeks = Math.round(diffDays / 7);
    const diffMonths = Math.round(diffDays / 30);
    const diffYears = Math.round(diffDays / 365);

    if (diffYears > 0) {
      return `${diffYears} ${this.pluralize(diffYears, 'year')} ago`;
    } else if (diffMonths > 0) {
      return `${diffMonths} ${this.pluralize(diffMonths, 'month')} ago`;
    } else if (diffWeeks > 0) {
      return `${diffWeeks} ${this.pluralize(diffWeeks, 'week')} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} ${this.pluralize(diffDays, 'day')} ago`;
    } else if (diffHrs > 0) {
      return `${diffHrs} ${this.pluralize(diffHrs, 'hour')} ago`;
    } else if (diffMin > 0) {
      return `${diffMin} ${this.pluralize(diffMin, 'minute')} ago`;
    } else if (diffSec > 10) {
      return `${diffSec} ${this.pluralize(diffSec, 'second')} ago`;
    } else {
      return 'just now';
    }
  }

  private pluralize(count: number, noun: string): string {
    if (count === 1) {
      return noun;
    }
    return `${noun}s`;
  }
}
