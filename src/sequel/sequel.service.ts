import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    await this.checkUserOrFail(userId);

    await this.prisma.sequel.create({
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
    await this.checkUserOrFail(userId);

    const sequels = await this.prisma.sequel.findMany({
      where: { userId },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            acts: {
              select: {
                id: true,
                title: true,
                status: true,
                scheduledAt: true,
                startedAt: true,
                previewFileName: true,
              },
              orderBy: { startedAt: 'asc' },
            },
          },
        },
        _count: { select: { acts: true, chapters: true } },
      },
    });

    return sequels.map((sequel) => ({
      ...sequel,
      coverFileName: `${this.baseUrl}/${sequel.coverFileName}`,
    }));
  }

  async getSequelById(id: number, userId: number) {
    const sequel = await this.prisma.sequel.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            acts: {
              select: {
                id: true,
                title: true,
                status: true,
                scheduledAt: true,
                startedAt: true,
                previewFileName: true,
              },
              orderBy: { startedAt: 'asc' },
            },
          },
        },
        _count: { select: { acts: true, chapters: true } },
      },
    });

    if (!sequel) throw new NotFoundException('Sequel not found');
    if (sequel.userId !== userId) throw new ForbiddenException('Access denied');

    return {
      ...sequel,
      coverFileName: `${this.baseUrl}/${sequel.coverFileName}`,
    };
  }

  async createChapter(sequelId: number, title: string, userId: number) {
    const sequel = await this.prisma.sequel.findUnique({
      where: { id: sequelId },
    });
    if (!sequel) throw new NotFoundException('Sequel not found');
    if (sequel.userId !== userId) throw new ForbiddenException('Access denied');

    const count = await this.prisma.chapter.count({ where: { sequelId } });

    return this.prisma.chapter.create({
      data: { title, sequelId, order: count },
    });
  }

  async updateChapter(chapterId: number, title: string, userId: number) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { sequel: { select: { userId: true } } },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');
    if (chapter.sequel.userId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { title },
    });
  }

  async deleteChapter(chapterId: number, userId: number) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { sequel: { select: { userId: true } } },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');
    if (chapter.sequel.userId !== userId)
      throw new ForbiddenException('Access denied');

    await this.prisma.chapter.delete({ where: { id: chapterId } });
    return { message: 'Chapter deleted' };
  }

  async getChapterById(chapterId: number) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        sequel: { select: { id: true, title: true, userId: true } },
        acts: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            scheduledAt: true,
            startedAt: true,
            previewFileName: true,
          },
          orderBy: { startedAt: 'asc' },
        },
      },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');
    return chapter;
  }

  private async checkUserOrFail(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Пользователь не найден');
  }
}
