import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SequelService } from './sequel.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSequelDto } from './dto/create-sequel.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';

@Controller('sequel')
@UseGuards(JwtAuthGuard)
export class SequelController {
  constructor(private readonly sequelService: SequelService) {}

  // ─── Sequels ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Создание сиквела' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'episodes', 'photo'],
      properties: {
        title: { type: 'string', example: 'My sequel' },
        episodes: { type: 'number', example: 5 },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @Post('create-sequel')
  @UseInterceptors(FileInterceptor('photo'))
  async createSequel(
    @Body() dto: CreateSequelDto,
    @UploadedFile() photo: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return await this.sequelService.createSequel(dto, photo, req.user.sub);
  }

  @ApiOperation({ summary: 'Мои сиквелы (с главами и актами)' })
  @Get('my-sequels')
  async getMySequels(@Req() req: RequestWithUser) {
    return await this.sequelService.getMySequels(req.user.sub);
  }

  @ApiOperation({ summary: 'Сиквел по ID (с главами и актами)' })
  @Get(':id')
  async getSequelById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return await this.sequelService.getSequelById(id, req.user.sub);
  }

  // ─── Chapters ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Создать главу внутри сиквела' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title'],
      properties: { title: { type: 'string', example: 'Chapter 1' } },
    },
  })
  @Post(':sequelId/chapters')
  async createChapter(
    @Param('sequelId', ParseIntPipe) sequelId: number,
    @Body('title') title: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.sequelService.createChapter(
      sequelId,
      title,
      req.user.sub,
    );
  }

  @ApiOperation({ summary: 'Получить главу с актами' })
  @Get('chapters/:chapterId')
  async getChapterById(@Param('chapterId', ParseIntPipe) chapterId: number) {
    return await this.sequelService.getChapterById(chapterId);
  }

  @ApiOperation({ summary: 'Переименовать главу' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title'],
      properties: { title: { type: 'string' } },
    },
  })
  @Patch('chapters/:chapterId')
  async updateChapter(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body('title') title: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.sequelService.updateChapter(
      chapterId,
      title,
      req.user.sub,
    );
  }

  @ApiOperation({ summary: 'Удалить главу' })
  @Delete('chapters/:chapterId')
  async deleteChapter(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Req() req: RequestWithUser,
  ) {
    return await this.sequelService.deleteChapter(chapterId, req.user.sub);
  }
}
