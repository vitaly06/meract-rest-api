import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { PollService } from './poll.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';

@ApiTags('Poll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @ApiOperation({
    summary: 'Создать опрос во время стрима',
    description:
      'Доступно только навигатору или владельцу акта. ' +
      'biddingTime — время голосования в минутах (1–60). ' +
      'options — от 2 до 5 вариантов ответа. ' +
      'После создания опрос рассылается всем зрителям через WebSocket (событие poll:new).',
  })
  @Post('act/:actId')
  create(
    @Req() req: RequestWithUser,
    @Param('actId', ParseIntPipe) actId: number,
    @Body() dto: CreatePollDto,
  ) {
    return this.pollService.createPoll(actId, req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Получить все активные опросы акта' })
  @Get('act/:actId')
  getActive(@Param('actId', ParseIntPipe) actId: number) {
    return this.pollService.getActivePolls(actId);
  }

  @ApiOperation({ summary: 'Получить опрос с результатами в процентах' })
  @Get(':pollId')
  getPoll(@Param('pollId', ParseIntPipe) pollId: number) {
    return this.pollService.getPoll(pollId);
  }

  @ApiOperation({
    summary: 'Проголосовать в опросе',
    description:
      'Один пользователь — один голос. После голоса всем участникам стрима ' +
      'приходит обновление через WebSocket (событие poll:update) с актуальными процентами.',
  })
  @Post(':pollId/vote')
  vote(
    @Req() req: RequestWithUser,
    @Param('pollId', ParseIntPipe) pollId: number,
    @Body() dto: VotePollDto,
  ) {
    return this.pollService.vote(pollId, req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Закрыть опрос досрочно (навигатор / владелец)' })
  @Patch(':pollId/close')
  close(
    @Req() req: RequestWithUser,
    @Param('pollId', ParseIntPipe) pollId: number,
  ) {
    return this.pollService.closePoll(pollId, req.user.sub);
  }
}
