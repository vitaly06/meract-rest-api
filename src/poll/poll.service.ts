import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MainGateway } from 'src/gateway/main.gateway';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';

const creatorSelect = {
  id: true,
  login: true,
  email: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PollService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MainGateway))
    private readonly gateway: MainGateway,
  ) {}

  private readonly pollInclude = {
    creator: { select: creatorSelect },
    options: { orderBy: { id: 'asc' as const } },
    votes: true,
  } as const;

  private formatPoll(poll: any) {
    const totalVotes: number = poll.votes.length;
    const now = new Date();
    const isActive = poll.isActive && now < new Date(poll.endsAt);
    return {
      id: poll.id,
      actId: poll.actId,
      title: poll.title,
      description: poll.description ?? null,
      endsAt: poll.endsAt,
      isActive,
      createdAt: poll.createdAt,
      creator: poll.creator,
      totalVotes,
      options: poll.options.map((opt: any) => {
        const optVotes = poll.votes.filter(
          (v: any) => v.optionId === opt.id,
        ).length;
        return {
          id: opt.id,
          text: opt.text,
          votes: optVotes,
          percent:
            totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0,
        };
      }),
    };
  }

  // ─── Создать опрос ────────────────────────────────────────────────────────────

  async createPoll(actId: number, userId: number, dto: CreatePollDto) {
    const act = await this.prisma.act.findUnique({ where: { id: actId } });
    if (!act) throw new NotFoundException('Акт не найден');
    if (act.status !== 'ONLINE')
      throw new ForbiddenException('Нельзя создавать опросы — акт не в эфире');

    const isOwner = act.userId === userId;
    if (!isOwner) {
      const participant = await this.prisma.actParticipant.findFirst({
        where: { actId, userId, role: 'navigator' },
      });
      if (!participant)
        throw new ForbiddenException(
          'Только навигатор или владелец акта может создавать опросы',
        );
    }

    const endsAt = new Date(Date.now() + dto.biddingTime * 60 * 1000);

    const poll = await this.prisma.poll.create({
      data: {
        actId,
        creatorId: userId,
        title: dto.title,
        description: dto.description,
        endsAt,
        options: { create: dto.options.map((text) => ({ text })) },
      },
      include: this.pollInclude,
    });

    const formatted = this.formatPoll(poll);
    this.gateway.broadcastPollNew(actId, formatted);

    // Автоматически закрыть по истечению времени
    setTimeout(
      async () => {
        const still = await this.prisma.poll.findUnique({
          where: { id: poll.id },
        });
        if (still?.isActive) {
          await this.prisma.poll.update({
            where: { id: poll.id },
            data: { isActive: false },
          });
          this.gateway.broadcastPollClosed(actId, poll.id);
        }
      },
      dto.biddingTime * 60 * 1000,
    );

    return formatted;
  }

  // ─── Получить активные опросы акта ───────────────────────────────────────────

  async getActivePolls(actId: number) {
    const polls = await this.prisma.poll.findMany({
      where: { actId, isActive: true },
      include: this.pollInclude,
      orderBy: { createdAt: 'desc' },
    });
    return polls.map((p) => this.formatPoll(p));
  }

  // ─── Получить один опрос ──────────────────────────────────────────────────────

  async getPoll(pollId: number) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: this.pollInclude,
    });
    if (!poll) throw new NotFoundException('Опрос не найден');
    return this.formatPoll(poll);
  }

  // ─── Проголосовать ────────────────────────────────────────────────────────────

  async vote(pollId: number, userId: number, dto: VotePollDto) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll) throw new NotFoundException('Опрос не найден');
    if (!poll.isActive || new Date() > poll.endsAt)
      throw new BadRequestException('Опрос уже завершён');

    const option = poll.options.find((o) => o.id === dto.optionId);
    if (!option) throw new NotFoundException('Вариант ответа не найден');

    const existing = await this.prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    if (existing)
      throw new BadRequestException('Вы уже проголосовали в этом опросе');

    await this.prisma.pollVote.create({
      data: { pollId, optionId: dto.optionId, userId },
    });

    const updated = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: this.pollInclude,
    });
    const formatted = this.formatPoll(updated);
    this.gateway.broadcastPollUpdate(poll.actId, formatted);
    return formatted;
  }

  // ─── Закрыть досрочно ─────────────────────────────────────────────────────────

  async closePoll(pollId: number, userId: number) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { act: true },
    });
    if (!poll) throw new NotFoundException('Опрос не найден');

    const isOwner = poll.act.userId === userId;
    if (!isOwner) {
      const participant = await this.prisma.actParticipant.findFirst({
        where: { actId: poll.actId, userId, role: 'navigator' },
      });
      if (!participant)
        throw new ForbiddenException('Нет прав для закрытия опроса');
    }

    await this.prisma.poll.update({
      where: { id: pollId },
      data: { isActive: false },
    });
    this.gateway.broadcastPollClosed(poll.actId, pollId);
    return { success: true };
  }
}
