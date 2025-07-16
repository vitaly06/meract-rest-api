import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.user.findUnique({ where: { email } });
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
}
