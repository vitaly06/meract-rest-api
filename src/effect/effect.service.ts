import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EffectService {
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

  async findAll(userId: number) {
    const effects = await this.prisma.effect.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
    });
    return this.effectsResponseToMap(effects);
  }

  async uploadEffect(filename: string, userId: number) {
    await this.prisma.effect.create({
      data: {
        fileName: `uploads/effects/${filename}`,
        userId,
      },
    });

    return { message: 'Эффект успешно загружен' };
  }

  private effectsResponseToMap(effects: any) {
    return effects.map((effect) => {
      return {
        ...effect,
        fileName: `${this.baseUrl}/${effect.fileName}`,
      };
    });
  }
}
