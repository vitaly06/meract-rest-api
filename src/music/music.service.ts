import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import * as mm from 'music-metadata';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MusicService {
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
    const musics = await this.prisma.music.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
    });

    return musics.map((music) => {
      return {
        ...music,
        fileName: `${this.baseUrl}/${music.fileName}`,
      };
    });
  }

  async uploadMusic(music: Express.Multer.File) {
    const filePath = path.join(process.cwd(), 'uploads/musics', music.filename);

    try {
      const fileBuffer = fs.readFileSync(filePath);

      const metadata = await mm.parseBuffer(fileBuffer, music.mimetype, {
        duration: true,
      });

      const durationInSeconds = metadata.format.duration;

      await this.prisma.music.create({
        data: {
          fileName: `uploads/musics/${music.filename}`,
          length: this.formatTime(durationInSeconds),
        },
      });

      return { message: 'Аудиофайл успешно загружен' };
    } catch (e) {
      throw new BadRequestException(`Error: ${e}`);
    }
  }

  private formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(Math.floor(remainingSeconds)).padStart(
      2,
      '0',
    );

    return `${formattedMinutes}:${formattedSeconds}`;
  }
}
