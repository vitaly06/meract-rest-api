import {
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EffectService } from './effect.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@Controller('effect')
export class EffectController {
  constructor(private readonly effectService: EffectService) {}

  @ApiOperation({
    summary: 'Получение всех эффектов',
  })
  @UseGuards(JwtAuthGuard)
  @Get('find-all')
  async findAll(@Req() req: RequestWithUser) {
    return await this.effectService.findAll(req.user.sub);
  }

  @ApiOperation({
    summary: 'Загрузка эффекта',
  })
  @ApiBody({
    description: 'Данные для создания effect',
    schema: {
      type: 'object',
      required: ['effect'],
      properties: {
        effect: {
          type: 'string',
          format: 'binary',
          description: 'effect file',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('upload-effect')
  @UseInterceptors(FileInterceptor('effect'))
  async uploadEffect(
    @UploadedFile() effect: Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return await this.effectService.uploadEffect(effect.filename, req.user.sub);
  }
}
