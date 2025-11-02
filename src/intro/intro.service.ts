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

  async findAll() {
    const intros = await this.prisma.intro.findMany({});
    return this.introsResponseToMap(intros);
  }

  async uploadIntro(filename: string) {
    await this.prisma.intro.create({
      data: {
        fileName: `uploads/intros/${filename}`,
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
