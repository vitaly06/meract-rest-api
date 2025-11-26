import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAdminRequest } from './dto/create-admin.dto';
import * as bcrypt from 'bcrypt';
import { UpdateAdminRequest } from './dto/update-admin.dto';
import { UtilsService } from 'src/common/utils/utils.serivice';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
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
}
