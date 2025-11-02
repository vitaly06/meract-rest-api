import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OutroService } from './outro.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

@Controller('outro')
export class OutroController {
  constructor(private readonly outroService: OutroService) {}

  @ApiOperation({
    summary: 'Получение всех аутро',
  })
  @Get('find-all')
  async findAll() {
    return await this.outroService.findAll();
  }

  @ApiOperation({
    summary: 'Загрузка аутро',
  })
  @ApiBody({
    description: 'Данные для создания аутро',
    schema: {
      type: 'object',
      required: ['outro'],
      properties: {
        outro: {
          type: 'string',
          format: 'binary',
          description: 'outro file',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('upload-outro')
  @UseInterceptors(FileInterceptor('outro'))
  async uploadOutro(@UploadedFile() outro: Multer.File) {
    return await this.outroService.uploadOutro(outro.filename);
  }
}
