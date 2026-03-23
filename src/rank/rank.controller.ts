import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RankService } from './rank.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CreateRankDto } from './dto/create-rank.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { AwardRankDto } from './dto/award-rank.dto';

@Controller('rank')
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @ApiOperation({
    summary: 'Создать ранг (admin). Передайте photo ИЛИ iconPackItemId в теле.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Бывалый' },
        iconPackItemId: {
          type: 'number',
          example: 5,
          description: 'ID иконки из активного пака',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Или загрузите файл напрямую',
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @Post('create-rank')
  async createRank(
    @Body() dto: CreateRankDto,
    @Req() req: RequestWithUser,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return await this.rankService.createRank(dto, req.user.sub, photo);
  }

  @ApiOperation({ summary: 'Обновить ранг' })
  @UseGuards(JwtAuthGuard)
  @Put('update-rank/:id')
  async updateRank(
    @Body() dto: CreateRankDto,
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.rankService.updateRank(+id, dto, req.user.sub);
  }

  @ApiOperation({ summary: 'Удалить ранг' })
  @UseGuards(JwtAuthGuard)
  @Delete('delete-rank/:id')
  async deleteRank(@Param('id') id: string, @Req() req: RequestWithUser) {
    return await this.rankService.deleteRank(+id, req.user.sub);
  }

  @ApiOperation({ summary: 'Все ранги' })
  @Get('find-all')
  async findAll() {
    return await this.rankService.findAll();
  }

  @ApiOperation({ summary: 'Выдать ранг (admin)' })
  @UseGuards(JwtAuthGuard)
  @Post('award')
  async awardRank(@Body() dto: AwardRankDto, @Req() req: RequestWithUser) {
    return await this.rankService.awardRank(dto, req.user.sub);
  }

  @ApiOperation({ summary: 'Ранги пользователя' })
  @Get('user/:userId')
  async getUserRanks(@Param('userId') userId: string) {
    return await this.rankService.getUserRanks(+userId);
  }

  @ApiOperation({ summary: 'Забрать ранг (admin)' })
  @UseGuards(JwtAuthGuard)
  @Post('revoke')
  async revokeRank(@Body() dto: AwardRankDto, @Req() req: RequestWithUser) {
    return await this.rankService.revokeRank(dto, req.user.sub);
  }

  @ApiOperation({
    summary: 'Лидерборд по очкам — среди инициаторов',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @Get('leaderboard/initiators')
  async leaderboardInitiators(@Query('limit') limit?: string) {
    return this.rankService.getLeaderboard('initiator', limit ? +limit : 50);
  }

  @ApiOperation({
    summary: 'Лидерборд по очкам — среди навигаторов',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @Get('leaderboard/navigators')
  async leaderboardNavigators(@Query('limit') limit?: string) {
    return this.rankService.getLeaderboard('navigator', limit ? +limit : 50);
  }

  @ApiOperation({
    summary: 'Лидерборд по очкам — среди героев',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @Get('leaderboard/heroes')
  async leaderboardHeroes(@Query('limit') limit?: string) {
    return this.rankService.getLeaderboard('hero', limit ? +limit : 50);
  }
}
