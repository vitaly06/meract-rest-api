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
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@ApiTags('Effect')
@Controller('effect')
export class EffectController {
  constructor(private readonly effectService: EffectService) {}

  @ApiOperation({
    summary: 'Получение всех эффектов',
  })
  @ApiResponse({
    status: 200,
    description: 'Список эффектов пользователя и публичных',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          fileName: {
            type: 'string',
            example: 'http://localhost:3000/uploads/effects/1234567890.mp4',
          },
          userId: { type: 'number', example: 5, nullable: true },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Get('find-all')
  async findAll(@Req() req: RequestWithUser) {
    return await this.effectService.findAll(req.user.sub);
  }

  @ApiOperation({
    summary: 'Загрузка эффекта',
  })
  @ApiResponse({
    status: 201,
    description: 'Эффект успешно загружен',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Эффект успешно загружен' },
      },
    },
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
