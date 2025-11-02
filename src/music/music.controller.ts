import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MusicService } from './music.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @ApiOperation({
    summary: 'Список всей музыки',
  })
  @Get('find-all')
  async findAll() {
    return await this.musicService.findAll();
  }

  @ApiOperation({
    summary: 'Загрузка музыки',
  })
  @ApiBody({
    description: 'Данные для создания музыки',
    schema: {
      type: 'object',
      required: ['music'],
      properties: {
        music: {
          type: 'string',
          format: 'binary',
          description: 'music file',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('upload-music')
  @UseInterceptors(FileInterceptor('music'))
  async uploadMusic(@UploadedFile() music: Multer.File) {
    return await this.musicService.uploadMusic(music);
  }
}
