import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';

@Injectable()
export class HeroVideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /** Получить текущее главное видео (публично) */
  async getHeroVideo() {
    const video = await this.prisma.heroVideo.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!video) throw new NotFoundException('Главное видео не установлено');
    return video;
  }

  /** Загрузить/заменить видео (только main admin) */
  async uploadHeroVideo(userId: number, file: Express.Multer.File) {
    await this.checkMainAdmin(userId);

    // Удаляем старое из S3 если есть
    const existing = await this.prisma.heroVideo.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      await this.s3Service.deleteFile(existing.url).catch(() => null);
      await this.prisma.heroVideo.deleteMany();
    }

    const s3Data = await this.s3Service.uploadFile(file);

    return this.prisma.heroVideo.create({
      data: {
        url: s3Data.url,
        s3Key: s3Data.key,
        mimeType: file.mimetype,
      },
    });
  }

  /** Удалить видео (только main admin) */
  async deleteHeroVideo(userId: number) {
    await this.checkMainAdmin(userId);

    const video = await this.prisma.heroVideo.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!video) throw new NotFoundException('Видео не найдено');

    await this.s3Service.deleteFile(video.url).catch(() => null);
    await this.prisma.heroVideo.deleteMany();

    return { message: 'Видео успешно удалено' };
  }

  private async checkMainAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || user.role.name !== 'main admin') {
      throw new ForbiddenException(
        'Только главный администратор может управлять видео',
      );
    }
  }
}
