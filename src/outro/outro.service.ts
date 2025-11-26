import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OutroService {
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
    const outros = await this.prisma.outro.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
    });
    return this.outrosResponseToMap(outros);
  }

  async uploadOutro(filename: string, userId: number) {
    await this.prisma.outro.create({
      data: {
        fileName: `uploads/outros/${filename}`,
        userId,
      },
    });

    return { message: 'Аутро успешно загружено' };
  }

  private outrosResponseToMap(outros: any) {
    return outros.map((outro) => {
      return {
        ...outro,
        fileName: `${this.baseUrl}/${outro.fileName}`,
      };
    });
  }
}
