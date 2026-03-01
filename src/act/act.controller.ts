import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActService } from './act.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { CreateActRequest } from './dto/create-act.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ApplySpotAgentDto } from './dto/apply-spot-agent.dto';
import { VoteSpotAgentDto } from './dto/vote-spot-agent.dto';
import { AssignSpotAgentDto } from './dto/assign-spot-agent.dto';
import { ApplyForRoleDto } from './dto/apply-for-role.dto';
import { VoteForCandidateDto } from './dto/vote-for-candidate.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('Акты')
@Controller('act')
export class ActController {
  constructor(private readonly actService: ActService) {}

  @ApiOperation({
    summary: 'Создание нового акта (стрима)',
    description:
      'Создаёт новый акт с указанными данными, командами и опциональными тегами. Превью-картинка передаётся как файл.',
  })
  @ApiBody({
    description:
      'Данные для создания акта (multipart/form-data). Поле `teams` — строка JSON с командами. Поле `tags` — массив строк.',
    schema: {
      type: 'object',
      required: ['title', 'teams'],
      properties: {
        title: { type: 'string', example: 'Очень Странные Дела' },
        description: {
          type: 'string',
          example: 'Описание акта',
          nullable: true,
        },
        sequelId: { type: 'number', example: 1, nullable: true },
        teams: {
          type: 'string',
          description:
            'JSON-массив команд. Каждая команда: name, roles[], tasks?[]',
          example:
            '[{"name":"Команда 1","roles":[{"role":"hero","openVoting":false,"candidateUserIds":[1,2]},{"role":"navigator","openVoting":true,"votingStartAt":"2026-03-01T10:00:00Z","votingDurationHours":24},{"role":"spot_agent","openVoting":false,"candidateUserIds":[3]}],"tasks":[{"description":"Задание 1","address":"ул. Ленина, 1"}]}]',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['приключение', 'квест', 'городской'],
          description: 'Теги для акта (опционально)',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Превью-изображение (опционально)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Акт успешно создан',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Некорректные входные данные',
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('create-act')
  @UseInterceptors(FileInterceptor('photo'))
  async createAct(
    @Req() req: RequestWithUser,
    @Body() dto: CreateActRequest,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return await this.actService.createAct(dto, req.user.sub, photo?.filename);
  }

  @ApiOperation({
    summary: 'Получение данных об акте по ID',
  })
  @Get('find-by-id/:id')
  async getActById(@Param('id') id: string) {
    return await this.actService.getActById(+id);
  }

  @ApiOperation({
    summary: 'Получение списка всех актов',
    description: 'Возвращает список всех актов с их подробной информацией.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список актов',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          previewFileName: { type: 'string', nullable: true },
          user: { type: 'string' },
          category: { type: 'string' },
          categoryId: { type: 'number' },
          status: { type: 'string' },
          spectators: { type: 'string' },
          duration: { type: 'string' },
          startDate: { type: 'string', example: '21 янв. 15:30' },
          liveIn: {
            type: 'string',
            example: '2ч 15мин',
            description:
              'Продолжительность стрима в формате: недели(н), дни(д), часы(ч), минуты(мин). Примеры: "2ч 15мин", "1н 3д", "5д 12ч"',
          },
        },
      },
    },
  })
  @Get('get-acts')
  @UseGuards(JwtAuthGuard)
  async getActs(@Req() req: RequestWithUser) {
    return await this.actService.getActs(req.user.sub);
  }

  @ApiOperation({
    summary: 'Остановить акт',
    description: 'Останавливает акт по его ID. Требуются права администратора.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Акт успешно остановлен',
    schema: {
      example: { message: 'Стрим успешно остановлен' },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Акт не найден',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Нет прав на остановку этого акта',
  })
  @Post('stop-act')
  @UseGuards(JwtAuthGuard)
  async stopAct(@Query('id') id: string, @Req() req: RequestWithUser) {
    return await this.actService.stopAct(+id, req);
  }

  @ApiOperation({
    summary: 'Получение статистики актов',
    description:
      'Возвращает статистику по активным стримам и действиям администраторов.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Данные статистики',
    schema: {
      example: {
        activeStreams: 5,
        allSpectators: 'Не реализовано',
        adminBlocked: 10,
      },
    },
  })
  @Get('statistic')
  async getStatistic() {
    return await this.actService.getStatistic();
  }

  @ApiOperation({
    summary: 'Генерация токена Agora',
    description: 'Генерирует токен Agora для указанного канала и роли.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Сгенерированный токен',
    schema: {
      example: { token: 'пример-токена-agora' },
    },
  })
  @Get('token/:channel/:role/:tokentype')
  async getToken(
    @Param('channel') channel: string,
    @Param('role') role: string,
    @Param('tokentype') tokentype: string,
    @Query('uid') uid?: string,
    @Query('expiry') expiryStr?: string,
  ) {
    console.log(
      `Генерация токена: канал=${channel}, роль=${role}, тип=${tokentype}, uid=${uid || '0'}, срок=${expiryStr}`,
    );
    const expiry = parseInt(expiryStr, 10) || 3600;
    const token = this.actService.generateToken(
      channel,
      role,
      tokentype,
      uid || '0',
      expiry,
    );
    return { token };
  }

  @Get(':actId/tasks')
  @ApiOperation({ summary: 'Получить все задания акта' })
  @ApiResponse({
    status: 200,
    description: 'Список заданий для акта',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          title: { type: 'string' },
          isCompleted: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          actId: { type: 'number' },
        },
      },
    },
  })
  async getActTasks(@Param('actId') actId: string) {
    return this.actService.getActTasks(+actId);
  }

  @Post(':actId/tasks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Добавить новое задание в акт' })
  @ApiBody({
    description: 'Данные задания',
    type: CreateTaskDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Задание успешно создано',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        isCompleted: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time', nullable: true },
        actId: { type: 'number' },
      },
    },
  })
  async addTask(
    @Param('actId') actId: string,
    @Body() dto: CreateTaskDto,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.addTaskToAct(+actId, dto.title, req.user.sub);
  }

  @Patch(':actId/tasks/:taskId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Переключить статус выполнения задания' })
  @ApiResponse({
    status: 200,
    description: 'Статус задания изменён',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        isCompleted: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time', nullable: true },
        actId: { type: 'number' },
      },
    },
  })
  async toggleTask(
    @Param('actId') actId: string,
    @Param('taskId') taskId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.toggleTaskStatus(+actId, +taskId, req.user.sub);
  }

  @Delete(':actId/tasks/:taskId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Удалить задание из акта' })
  @ApiResponse({
    status: 200,
    description: 'Задание успешно удалено',
    schema: {
      example: { message: 'Задание успешно удалено' },
    },
  })
  async deleteTask(
    @Param('actId') actId: string,
    @Param('taskId') taskId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.deleteTask(+actId, +taskId, req.user.sub);
  }

  // ==================== SPOT AGENT ENDPOINTS ====================

  @Post('spot-agent/apply')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Подать заявку на роль Spot Agent',
    description: 'Пользователь подаёт заявку стать spot agent для акта',
  })
  @ApiResponse({
    status: 201,
    description: 'Заявка на роль spot agent успешно подана',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        actId: { type: 'number' },
        userId: { type: 'number' },
        status: { type: 'string', example: 'pending' },
        appliedAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            login: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiBody({ type: ApplySpotAgentDto })
  async applyAsSpotAgent(
    @Body() dto: ApplySpotAgentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.applyAsSpotAgent(dto.actId, req.user.sub);
  }

  @Get(':actId/spot-agent/candidates')
  @ApiOperation({
    summary: 'Получить всех кандидатов на роль Spot Agent',
    description:
      'Возвращает список всех кандидатов, подавших заявку на роль spot agent для акта',
  })
  @ApiResponse({
    status: 200,
    description: 'Список кандидатов на роль spot agent с количеством голосов',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          actId: { type: 'number' },
          userId: { type: 'number' },
          status: { type: 'string', example: 'pending' },
          appliedAt: { type: 'string', format: 'date-time' },
          voteCount: { type: 'number' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              login: { type: 'string' },
              email: { type: 'string' },
            },
          },
          votes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                voterId: { type: 'number' },
                votedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  })
  async getSpotAgentCandidates(@Param('actId') actId: string) {
    return this.actService.getSpotAgentCandidates(+actId);
  }

  @Post('spot-agent/vote')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Проголосовать за кандидата на роль Spot Agent',
    description:
      'Голосование за кандидата на роль spot agent (только если голосование открыто)',
  })
  @ApiResponse({
    status: 201,
    description: 'Голос успешно учтён',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        candidateId: { type: 'number' },
        voterId: { type: 'number' },
        votedAt: { type: 'string', format: 'date-time' },
        voter: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            login: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiBody({ type: VoteSpotAgentDto })
  async voteForSpotAgent(
    @Body() dto: VoteSpotAgentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.voteForSpotAgentCandidate(
      dto.candidateId,
      req.user.sub,
    );
  }

  @Post('spot-agent/assign')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Назначить Spot Agent (только инициатор)',
    description:
      'Инициатор назначает пользователя на роль spot agent с опциональным описанием задания',
  })
  @ApiResponse({
    status: 201,
    description: 'Spot Agent успешно назначен',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        actId: { type: 'number' },
        userId: { type: 'number' },
        task: { type: 'string', nullable: true },
        status: { type: 'string', example: 'active' },
        assignedAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            login: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiBody({ type: AssignSpotAgentDto })
  async assignSpotAgent(
    @Body() dto: AssignSpotAgentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.assignSpotAgent(
      dto.actId,
      dto.userId,
      req.user.sub,
      dto.task,
    );
  }

  @Get(':actId/spot-agent/assigned')
  @ApiOperation({
    summary: 'Получить всех назначенных Spot Agent',
    description:
      'Возвращает список всех пользователей, назначенных на роль spot agent для акта',
  })
  @ApiResponse({
    status: 200,
    description: 'Список назначенных spot agent',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          actId: { type: 'number' },
          userId: { type: 'number' },
          task: { type: 'string', nullable: true },
          status: { type: 'string', example: 'active' },
          assignedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              login: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getAssignedSpotAgents(@Param('actId') actId: string) {
    return this.actService.getAssignedSpotAgents(+actId);
  }

  @Delete(':actId/spot-agent/:spotAgentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Удалить назначенного Spot Agent (только инициатор)',
    description: 'Инициатор удаляет назначенного spot agent из акта',
  })
  @ApiResponse({
    status: 200,
    description: 'Spot Agent успешно удалён',
    schema: {
      example: { message: 'Spot Agent успешно удалён' },
    },
  })
  async removeSpotAgent(
    @Param('actId') actId: string,
    @Param('spotAgentId') spotAgentId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.removeSpotAgent(+actId, +spotAgentId, req.user.sub);
  }

  // ... существующий код ActController ...

  @Post(':actId/apply-role')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Подать заявку на роль Героя или Навигатора',
  })
  @ApiBody({ type: ApplyForRoleDto })
  async applyForRole(
    @Param('actId') actId: string,
    @Body() dto: ApplyForRoleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.applyForRole(
      +actId,
      req.user.sub,
      dto.roleType,
      dto.bidAmount,
      dto.bidItem,
    );
  }

  @Post(':actId/vote-candidate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Проголосовать за кандидата на роль',
  })
  @ApiBody({ type: VoteForCandidateDto })
  async voteForCandidate(
    @Param('actId') actId: string,
    @Body() dto: VoteForCandidateDto,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.voteForCandidate(dto.candidateId, req.user.sub);
  }

  @Post(':actId/assign-role')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Назначить роль (только инициатор)',
  })
  @ApiBody({ type: AssignRoleDto })
  async assignRole(
    @Param('actId') actId: string,
    @Body() dto: AssignRoleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.assignRole(
      +actId,
      req.user.sub,
      dto.roleType,
      dto.candidateId,
    );
  }

  @Get(':actId/candidates/:roleType')
  @ApiOperation({
    summary: 'Получить список кандидатов на роль',
  })
  async getCandidates(
    @Param('actId') actId: string,
    @Param('roleType') roleType: 'hero' | 'navigator',
  ) {
    return this.actService.getCandidates(+actId, roleType);
  }
}
