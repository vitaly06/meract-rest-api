import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RankService } from './rank.service';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CreateRankDto } from './dto/create-rank.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { AwardRankDto } from './dto/award-rank.dto';

@Controller('rank')
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @ApiOperation({
    summary: 'Создать ранг',
  })
  @UseGuards(JwtAuthGuard)
  @Post('create-rank')
  async createRank(@Body() dto: CreateRankDto, @Req() req: RequestWithUser) {
    return await this.rankService.createRank(dto, req.user.sub);
  }

  @ApiOperation({
    summary: 'Обновить ранг',
  })
  @UseGuards(JwtAuthGuard)
  @Put('update-rank/:id')
  async updateRank(
    @Body() dto: CreateRankDto,
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.rankService.updateRank(+id, dto, req.user.sub);
  }

  @ApiOperation({
    summary: 'Удалить ранг',
  })
  @UseGuards(JwtAuthGuard)
  @Delete('delete-rank/:id')
  async deleteRank(@Param('id') id: string, @Req() req: RequestWithUser) {
    return await this.rankService.deleteRank(+id, req.user.sub);
  }

  @ApiOperation({
    summary: 'Все ранги',
  })
  @Get('find-all')
  async findAll() {
    return await this.rankService.findAll();
  }

  @ApiOperation({
    summary: 'Выдать ранг',
  })
  @UseGuards(JwtAuthGuard)
  @Post('award')
  async awardRank(@Body() dto: AwardRankDto, @Req() req: RequestWithUser) {
    return await this.rankService.awardRank(dto, req.user.sub);
  }

  @ApiOperation({
    summary: 'Ранги пользователя',
  })
  @Get('user/:userId')
  async getUserRanks(@Param('userId') userId: string) {
    return await this.rankService.getUserRanks(+userId);
  }

  @ApiOperation({
    summary: 'Забрать ранг',
  })
  @UseGuards(JwtAuthGuard)
  @Post('revoke')
  async revokeRank(@Body() dto: AwardRankDto, @Req() req: RequestWithUser) {
    return await this.rankService.revokeRank(dto, req.user.sub);
  }
}
