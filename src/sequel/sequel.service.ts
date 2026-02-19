import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSequelDto } from './dto/create-sequel.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SequelService {
  baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
  }

  async createSequel(
    dto: CreateSequelDto,
    photo: Express.Multer.File,
    userId: number,
  ) {
    const checkUser = await this.checkUser(userId);

    if (!checkUser) {
      throw new BadRequestException('Пользователь не найден');
    }

    const sequel = await this.prisma.sequel.create({
      data: {
        title: dto.title,
        episodes: +dto.episodes,
        coverFileName: `uploads/sequels/${photo.filename}`,
        userId,
      },
    });

    return { message: 'Сиквел успешно создан' };
  }

  async getMySequels(userId: number) {
    const checkUser = await this.checkUser(userId);

    if (!checkUser) {
      throw new BadRequestException('Пользователь не найден');
    }

    const sequels = await this.prisma.sequel.findMany({
      where: { userId },
    });

    return sequels.map((sequel) => {
      return {
        ...sequel,
        coverFileName: `${this.baseUrl}/${sequel.coverFileName}`,
      };
    });
  }

  private async checkUser(userId) {
    const checkUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return checkUser ? true : false;
  }
}
