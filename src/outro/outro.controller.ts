import {
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OutroService } from './outro.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@Controller('outro')
export class OutroController {
  constructor(private readonly outroService: OutroService) {}

  @ApiOperation({
    summary: 'Получение всех аутро',
  })
  @UseGuards(JwtAuthGuard)
  @Get('find-all')
  async findAll(@Req() req: RequestWithUser) {
    return await this.outroService.findAll(req.user.sub);
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
  async uploadOutro(
    @UploadedFile() outro: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return await this.outroService.uploadOutro(outro.filename, req.user.sub);
  }
}
