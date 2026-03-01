import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { AwardAchievementDto } from './dto/award-achievement.dto';
import { AwardGuildAchievementDto } from './dto/award-guild-achievement.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('achievement')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}
  @ApiOperation({
    summary: 'Создать достижение',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'photo'],
      properties: {
        name: { type: 'string', example: 'Act master' },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Achievement image',
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @Post('create-achievement')
  async createAchievement(
    @Body() dto: CreateAchievementDto,
    @Req() req: RequestWithUser,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return await this.achievementService.createAchievement(
      dto,
      req.user.sub,
      photo,
    );
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

  // ─── Guild achievements ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Выдать достижение гильдии' })
  @UseGuards(JwtAuthGuard)
  @Post('guild/award')
  async awardGuildAchievement(
    @Body() dto: AwardGuildAchievementDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.achievementService.awardGuildAchievement(
      dto,
      req.user.sub,
    );
  }

  @ApiOperation({ summary: 'Достижения гильдии' })
  @Get('guild/:guildId')
  async getGuildAchievements(@Param('guildId') guildId: string) {
    return await this.achievementService.getGuildAchievements(+guildId);
  }

  @ApiOperation({ summary: 'Забрать достижение у гильдии' })
  @UseGuards(JwtAuthGuard)
  @Post('guild/revoke')
  async revokeGuildAchievement(
    @Body() dto: AwardGuildAchievementDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.achievementService.revokeGuildAchievement(
      dto,
      req.user.sub,
    );
  }
}
