import {
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { HeroVideoService } from './hero-video.service';

@ApiTags('Hero Video')
@Controller('hero-video')
export class HeroVideoController {
  constructor(private readonly heroVideoService: HeroVideoService) {}

  @ApiOperation({ summary: 'Получить главное видео (публично)' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        id: 1,
        url: 'https://s3.twcstorage.ru/bucket/1234567890-hero.mp4',
        s3Key: '1234567890-hero.mp4',
        mimeType: 'video/mp4',
        createdAt: '2026-03-21T10:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
      },
    },
  })
  @Get()
  async getHeroVideo() {
    return this.heroVideoService.getHeroVideo();
  }

  @ApiOperation({
    summary: 'Загрузить/заменить главное видео (только main admin)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['video'],
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: 'Видеофайл (mp4, webm и т.д.)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Видео загружено' })
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('video'))
  async uploadHeroVideo(
    @Req() req: RequestWithUser,
    @UploadedFile() video: Express.Multer.File,
  ) {
    return this.heroVideoService.uploadHeroVideo(req.user.sub, video);
  }

  @ApiOperation({ summary: 'Удалить главное видео (только main admin)' })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Видео успешно удалено' } },
  })
  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteHeroVideo(@Req() req: RequestWithUser) {
    return this.heroVideoService.deleteHeroVideo(req.user.sub);
  }
}
