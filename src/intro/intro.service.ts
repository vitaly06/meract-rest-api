import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IntroService {
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
    const intros = await this.prisma.intro.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
    });
    return this.introsResponseToMap(intros);
  }

  async uploadIntro(filename: string, userId: number) {
    await this.prisma.intro.create({
      data: {
        fileName: `uploads/intros/${filename}`,
        userId,
      },
    });

    return { message: 'Интро успешно загружено' };
  }

  private introsResponseToMap(intros: any) {
    return intros.map((intro) => {
      return {
        ...intro,
        fileName: `${this.baseUrl}/${intro.fileName}`,
      };
    });
  }
}
