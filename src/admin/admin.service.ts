import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAdminRequest } from './dto/create-admin.dto';
import * as bcrypt from 'bcrypt';
import { UpdateAdminRequest } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.user.findMany({
      where: {
        role: {
          name: 'admin',
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

  async createAdmin(dto: CreateAdminRequest) {
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

    return await this.prisma.user.create({
      data: {
        login,
        email,
        password: hashedPassword,
        roleId: role.id,
      },
    });
  }

  async update(dto: UpdateAdminRequest, id: number) {
    const checkAdmin = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!checkAdmin) {
      throw new NotFoundException('Admin with this id not found');
    }

    dto.password = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
      },
    });

    return { message: 'admin updated successfully' };
  }

  async delete(id: number) {
    await this.findById(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Admin successfully removed' };
  }
}
