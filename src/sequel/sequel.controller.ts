import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SequelService } from './sequel.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSequelDto } from './dto/create-sequel.dto';
import { Multer } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';

@Controller('sequel')
export class SequelController {
  constructor(private readonly sequelService: SequelService) {}

  @ApiOperation({
    summary: 'Создание сиквела',
  })
  @ApiBody({
    description: 'Данные для создания сиквела',
    schema: {
      type: 'object',
      required: ['title', 'episodes', 'photo'],
      properties: {
        title: { type: 'string', example: 'My sequel' },
        episodes: { type: 'number', example: 5 },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'preview image',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('create-sequel')
  @UseInterceptors(FileInterceptor('photo'))
  async createSequel(
    @Body() dto: CreateSequelDto,
    @UploadedFile() photo: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return await this.sequelService.createSequel(dto, photo, req.user.sub);
  }

  @ApiOperation({
    summary: 'Получение моих сиквелов',
  })
  @UseGuards(JwtAuthGuard)
  @Get('my-sequels')
  async getMySequels(@Req() req: RequestWithUser) {
    return await this.sequelService.getMySequels(req.user.sub);
  }
}
