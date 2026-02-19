import {
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IntroService } from './intro.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@Controller('intro')
export class IntroController {
  constructor(private readonly introService: IntroService) {}

  @ApiOperation({
    summary: 'Получение всех интро',
  })
  @UseGuards(JwtAuthGuard)
  @Get('find-all')
  async findAll(@Req() req: RequestWithUser) {
    return await this.introService.findAll(req.user.sub);
  }

  @ApiOperation({
    summary: 'Загрузка интро',
  })
  @ApiBody({
    description: 'Данные для создания intro',
    schema: {
      type: 'object',
      required: ['intro'],
      properties: {
        intro: {
          type: 'string',
          format: 'binary',
          description: 'intro file',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('upload-intro')
  @UseInterceptors(FileInterceptor('intro'))
  async uploadIntro(
    @UploadedFile() intro: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return await this.introService.uploadIntro(intro.filename, req.user.sub);
  }
}
