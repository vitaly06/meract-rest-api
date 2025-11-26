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
import { AchievementService } from './achievement.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { AwardAchievementDto } from './dto/award-achievement.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('achievement')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}
  @ApiOperation({
    summary: 'Создать достижение',
  })
  @UseGuards(JwtAuthGuard)
  @Post('create-achievement')
  async createAchievement(
    @Body() dto: CreateAchievementDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.achievementService.createAchievement(dto, req.user.sub);
  }

  @ApiOperation({
    summary: 'Обновить достижение',
  })
  @UseGuards(JwtAuthGuard)
  @Put('update-achievement/:id')
  async updateAchievement(
    @Body() dto: CreateAchievementDto,
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.achievementService.updateAchievement(
      +id,
      dto,
      req.user.sub,
    );
  }

  @ApiOperation({
    summary: 'Удалить достижение',
  })
  @UseGuards(JwtAuthGuard)
  @Delete('delete-achievement/:id')
  async deleteAchievement(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.achievementService.deleteAchievement(+id, req.user.sub);
  }

  @ApiOperation({
    summary: 'Все достижения',
  })
  @Get('find-all')
  async findAll() {
    return await this.achievementService.findAll();
  }

  @ApiOperation({
    summary: 'Выдать достижение',
  })
  @UseGuards(JwtAuthGuard)
  @Post('award')
  async awardAchievement(
    @Body() dto: AwardAchievementDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.achievementService.awardAchievement(dto, req.user.sub);
  }

  @ApiOperation({
    summary: 'Достижения пользователя',
  })
  @Get('user/:userId')
  async getUserAchievements(@Param('userId') userId: string) {
    return await this.achievementService.getUserAchievements(+userId);
  }

  @ApiOperation({
    summary: 'Забрать достижение',
  })
  @UseGuards(JwtAuthGuard)
  @Post('revoke')
  async revokeAchievement(
    @Body() dto: AwardAchievementDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.achievementService.revokeAchievement(dto, req.user.sub);
  }
}
