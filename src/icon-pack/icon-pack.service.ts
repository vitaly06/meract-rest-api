import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IconPackType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { CreateIconPackDto } from './dto/create-icon-pack.dto';

@Injectable()
export class IconPackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  // ─── Admin helpers ─────────────────────────────────────────────────────────

  private async checkAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || !['admin', 'main admin'].includes(user.role?.name)) {
      throw new ForbiddenException('Недостаточно прав');
    }
  }

  // ─── CRUD пак ──────────────────────────────────────────────────────────────

  /** Создать новый пак иконок */
  async createPack(adminId: number, dto: CreateIconPackDto) {
    await this.checkAdmin(adminId);
    return this.prisma.iconPack.create({
      data: { name: dto.name, type: dto.type },
      include: { icons: true },
    });
  }

  /** Все паки (по умолчанию все типы, можно фильтровать) */
  async getAllPacks(type?: IconPackType) {
    return this.prisma.iconPack.findMany({
      where: type ? { type } : undefined,
      include: {
        icons: { orderBy: { createdAt: 'asc' } },
        _count: { select: { icons: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Получить активный пак по типу */
  async getActivePack(type: IconPackType) {
    const pack = await this.prisma.iconPack.findFirst({
      where: { type, isActive: true },
      include: { icons: { orderBy: { createdAt: 'asc' } } },
    });
    if (!pack) throw new NotFoundException('Активный пак не найден');
    return pack;
  }

  /** Активировать пак (деактивирует все остальные того же типа) */
  async activatePack(adminId: number, packId: number) {
    await this.checkAdmin(adminId);

    const pack = await this.prisma.iconPack.findUnique({
      where: { id: packId },
    });
    if (!pack) throw new NotFoundException('Пак не найден');

    // Деактивируем все паки того же типа
    await this.prisma.iconPack.updateMany({
      where: { type: pack.type },
      data: { isActive: false },
    });

    return this.prisma.iconPack.update({
      where: { id: packId },
      data: { isActive: true },
      include: { icons: true },
    });
  }

  /** Удалить пак (и все иконки из S3) */
  async deletePack(adminId: number, packId: number) {
    await this.checkAdmin(adminId);

    const pack = await this.prisma.iconPack.findUnique({
      where: { id: packId },
      include: { icons: true },
    });
    if (!pack) throw new NotFoundException('Пак не найден');

    // Удаляем все иконки из S3
    await Promise.allSettled(
      pack.icons.map((icon) => this.s3Service.deleteFile(icon.url)),
    );

    await this.prisma.iconPack.delete({ where: { id: packId } });
    return { message: 'Пак удалён' };
  }

  // ─── Иконки ────────────────────────────────────────────────────────────────

  /** Загрузить несколько иконок в пак */
  async uploadIcons(
    adminId: number,
    packId: number,
    files: Express.Multer.File[],
  ) {
    await this.checkAdmin(adminId);

    const pack = await this.prisma.iconPack.findUnique({
      where: { id: packId },
    });
    if (!pack) throw new NotFoundException('Пак не найден');
    if (!files || files.length === 0)
      throw new BadRequestException('Файлы не переданы');

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const s3Data = await this.s3Service.uploadFile(file);
        return this.prisma.iconPackItem.create({
          data: {
            name: file.originalname,
            url: s3Data.url,
            s3Key: s3Data.key,
            packId,
          },
        });
      }),
    );

    return { uploaded: uploaded.length, icons: uploaded };
  }

  /** Удалить одну иконку из пака */
  async deleteIcon(adminId: number, iconId: number) {
    await this.checkAdmin(adminId);

    const icon = await this.prisma.iconPackItem.findUnique({
      where: { id: iconId },
    });
    if (!icon) throw new NotFoundException('Иконка не найдена');

    await this.s3Service.deleteFile(icon.url);
    await this.prisma.iconPackItem.delete({ where: { id: iconId } });
    return { message: 'Иконка удалена' };
  }

  /** Получить иконку по id (для получения URL при создании достижения/ранга) */
  async getIconById(iconId: number) {
    const icon = await this.prisma.iconPackItem.findUnique({
      where: { id: iconId },
    });
    if (!icon) throw new NotFoundException('Иконка не найдена');
    return icon;
  }
}
