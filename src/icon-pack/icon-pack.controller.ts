import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IconPackType } from '@prisma/client';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { IconPackService } from './icon-pack.service';
import { CreateIconPackDto } from './dto/create-icon-pack.dto';

@ApiTags('Icon Packs')
@Controller('icon-pack')
export class IconPackController {
  constructor(private readonly iconPackService: IconPackService) {}

  @ApiOperation({ summary: 'Создать пак иконок (admin)' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async createPack(
    @Body() dto: CreateIconPackDto,
    @Req() req: RequestWithUser,
  ) {
    return this.iconPackService.createPack(req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'Все паки (опционально фильтр по type=ACHIEVEMENT|RANK)',
  })
  @ApiQuery({ name: 'type', required: false, enum: IconPackType })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllPacks(@Query('type') type?: IconPackType) {
    return this.iconPackService.getAllPacks(type);
  }

  @ApiOperation({ summary: 'Активный пак по типу' })
  @ApiQuery({ name: 'type', required: true, enum: IconPackType })
  @Get('active')
  async getActivePack(@Query('type') type: IconPackType) {
    return this.iconPackService.getActivePack(type);
  }

  @ApiOperation({ summary: 'Активировать пак (admin)' })
  @UseGuards(JwtAuthGuard)
  @Patch(':packId/activate')
  async activatePack(
    @Param('packId') packId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.iconPackService.activatePack(req.user.sub, +packId);
  }

  @ApiOperation({
    summary: 'Загрузить иконки в пак (admin, multipart, поле icons)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icons: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Post(':packId/upload')
  @UseInterceptors(FilesInterceptor('icons', 100))
  async uploadIcons(
    @Param('packId') packId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: RequestWithUser,
  ) {
    return this.iconPackService.uploadIcons(req.user.sub, +packId, files);
  }

  @ApiOperation({ summary: 'Удалить иконку из пака (admin)' })
  @UseGuards(JwtAuthGuard)
  @Delete('icons/:iconId')
  async deleteIcon(
    @Param('iconId') iconId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.iconPackService.deleteIcon(req.user.sub, +iconId);
  }

  @ApiOperation({ summary: 'Удалить пак со всеми иконками (admin)' })
  @UseGuards(JwtAuthGuard)
  @Delete(':packId')
  async deletePack(
    @Param('packId') packId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.iconPackService.deletePack(req.user.sub, +packId);
  }
}
