import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  BadRequestException,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { ActService } from './act.service';
import { CreateActRequest } from './dto/create-act.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ActType, ActFormat } from '@prisma/client';
import { SelectionMethods } from './enum/act.enum';
import { ApplySpotAgentDto } from './dto/apply-spot-agent.dto';
import { VoteSpotAgentDto } from './dto/vote-spot-agent.dto';
import { AssignSpotAgentDto } from './dto/assign-spot-agent.dto';

@ApiTags('Acts')
@Controller('act')
export class ActController {
  constructor(private readonly actService: ActService) {}

  @ApiOperation({
    summary: 'Create a new act (stream)',
    description:
      'Creates a new act with the provided details and optional preview image.',
  })
  @ApiBody({
    description: 'Act creation data with optional preview image and tasks',
    schema: {
      type: 'object',
      required: [
        'title',
        'introId',
        'outroId',
        'type',
        'format',
        'heroMethods',
        'navigatorMethods',
        'biddingTime',
        'photo',
        'musicIds',
      ],
      properties: {
        title: { type: 'string', example: 'CS 2 Faceit Stream' },
        sequelId: { type: 'number', example: 1 },
        introId: { type: 'number', example: 1 },
        outroId: { type: 'number', example: 1 },
        effectId: {
          type: 'number',
          example: 1,
          description: 'Effect ID (optional)',
        },
        musicIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2, 3],
          description:
            'Array of music track IDs to be played during the stream',
        },
        type: {
          type: 'string',
          enum: Object.values(ActType),
          example: ActType.SINGLE,
        },
        format: {
          type: 'string',
          enum: Object.values(ActFormat),
          example: ActFormat.SINGLE,
        },
        heroMethods: {
          type: 'string',
          enum: Object.values(SelectionMethods),
          example: SelectionMethods.VOTING,
        },
        navigatorMethods: {
          type: 'string',
          enum: Object.values(SelectionMethods),
          example: SelectionMethods.VOTING,
        },
        spotAgentMethods: {
          type: 'string',
          enum: Object.values(SelectionMethods),
          example: SelectionMethods.VOTING,
        },
        spotAgentCount: {
          type: 'number',
          example: 3,
          description: 'Number of spot agents required',
        },
        biddingTime: { type: 'string', example: '2025-09-15T12:00:00Z' },
        routePoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              latitude: { type: 'number', example: 52.3676 },
              longitude: { type: 'number', example: 4.9041 },
            },
          },
          example: [
            { latitude: 52.3676, longitude: 4.9041 },
            { latitude: 52.37, longitude: 4.895 },
            { latitude: 52.375, longitude: 4.89 },
          ],
          description:
            'Array of route points for the map (multiple waypoints). NOTE: If provided, startLatitude/startLongitude/destinationLatitude/destinationLongitude will be IGNORED.',
        },
        startLatitude: {
          type: 'number',
          example: 52.3675734,
          description:
            '[DEPRECATED] Use routePoints instead. Ignored if routePoints is provided.',
        },
        startLongitude: {
          type: 'number',
          example: 4.9041389,
          description:
            '[DEPRECATED] Use routePoints instead. Ignored if routePoints is provided.',
        },
        destinationLatitude: {
          type: 'number',
          example: 52.370216,
          description:
            '[DEPRECATED] Use routePoints instead. Ignored if routePoints is provided.',
        },
        destinationLongitude: {
          type: 'number',
          example: 4.895168,
          description:
            '[DEPRECATED] Use routePoints instead. Ignored if routePoints is provided.',
        },
        photo: {
          type: 'string',
          format: 'binary',
        },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'Reach Global Elite' },
            },
          },
          example: [
            { title: 'Reach Global Elite' },
            { title: 'Win 10 games' },
            { title: 'Do 100 headshots' },
          ],
          description:
            'Array of tasks for the act (all tasks start as not completed)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Act successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        title: { type: 'string', example: 'CS 2 Faceit Stream' },
        previewFileName: {
          type: 'string',
          example: '/uploads/acts/1234567890.jpg',
        },
        sequelId: { type: 'number', nullable: true, example: null },
        type: { type: 'string', enum: ['SINGLE', 'MULTI'], example: 'SINGLE' },
        format: {
          type: 'string',
          enum: ['SINGLE', 'MULTI'],
          example: 'SINGLE',
        },
        heroMethods: {
          type: 'string',
          enum: ['VOTING', 'ROULETTE'],
          example: 'VOTING',
        },
        navigatorMethods: {
          type: 'string',
          enum: ['VOTING', 'ROULETTE'],
          example: 'VOTING',
        },
        biddingTime: { type: 'string', example: '2025-09-15T12:00:00Z' },
        introId: { type: 'number', example: 1 },
        outroId: { type: 'number', example: 1 },
        effectId: { type: 'number', nullable: true, example: null },
        status: {
          type: 'string',
          enum: ['ONLINE', 'OFFLINE'],
          example: 'ONLINE',
        },
        startedAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-01-14T07:14:20.306Z',
        },
        endedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: null,
        },
        likes: { type: 'number', example: 0 },
        recordingResourceId: { type: 'string', nullable: true, example: null },
        recordingSid: { type: 'string', nullable: true, example: null },
        recordingUrl: { type: 'string', nullable: true, example: null },
        recordingStatus: {
          type: 'string',
          nullable: true,
          example: 'recording',
        },
        startLatitude: { type: 'number', nullable: true, example: 52.3675734 },
        startLongitude: { type: 'number', nullable: true, example: 4.9041389 },
        destinationLatitude: {
          type: 'number',
          nullable: true,
          example: 52.370216,
        },
        destinationLongitude: {
          type: 'number',
          nullable: true,
          example: 4.895168,
        },
        categoryId: { type: 'number', nullable: true, example: null },
        userId: { type: 'number', example: 5 },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 5 },
            login: { type: 'string', example: 'streamer123' },
            email: { type: 'string', example: 'streamer@example.com' },
          },
        },
        routePoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              actId: { type: 'number', example: 1 },
              latitude: { type: 'number', example: 52.3676 },
              longitude: { type: 'number', example: 4.9041 },
              order: { type: 'number', example: 0 },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2026-01-14T07:14:20.306Z',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('create-act')
  @UseInterceptors(FileInterceptor('photo'))
  async createAct(
    @Req() req: RequestWithUser,
    @Body() dto: CreateActRequest,
    @UploadedFile() photo: Multer.File,
  ) {
    if (!photo) {
      throw new BadRequestException('Photo has been is not empty');
    }
    return await this.actService.createAct(dto, req.user.sub, photo.filename);
  }

  @ApiOperation({
    summary: 'Получение данных об акте по id',
  })
  @Get('find-by-id/:id')
  async getActById(@Param('id') id: string) {
    return await this.actService.getActById(+id);
  }

  @ApiOperation({
    summary: 'Get all acts',
    description: 'Retrieves a list of all acts with their details.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of acts',
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
          startDate: { type: 'string', example: '21 Jan. 15:30' },
          liveIn: {
            type: 'string',
            example: '2h 15m',
            description:
              'Stream duration in format: weeks(w), days(d), hours(h), minutes(m). Examples: "2h 15m", "1w 3d", "5d 12h"',
          },
        },
      },
    },
  })
  @Get('get-acts')
  async getActs() {
    return await this.actService.getActs();
  }

  @ApiOperation({
    summary: 'Stop an act',
    description: 'Stops an act by its ID. Requires admin privileges.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Act successfully stopped',
    schema: {
      example: { message: 'Stream successfully stopped' },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Act not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to stop this act',
  })
  @Post('stop-act')
  @UseGuards(JwtAuthGuard)
  async stopAct(@Query('id') id: string, @Req() req: RequestWithUser) {
    return await this.actService.stopAct(+id, req);
  }

  @ApiOperation({
    summary: 'Get act statistics',
    description: 'Retrieves statistics about active streams and admin actions.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics data',
    schema: {
      example: {
        activeStreams: 5,
        allSpectators: 'Not done',
        adminBlocked: 10,
      },
    },
  })
  @Get('statistic')
  async getStatistic() {
    return await this.actService.getStatistic();
  }

  @ApiOperation({
    summary: 'Generate Agora token',
    description: 'Generates an Agora token for a specific channel and role.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Generated token',
    schema: {
      example: { token: 'example-agora-token' },
    },
  })
  @Get('token/:channel/:role/:tokentype')
  async getToken(
    @Param('channel') channel: string,
    @Param('role') role: string,
    @Param('tokentype') tokentype: string,
    @Query('uid') uid?: string, // uid теперь в query
    @Query('expiry') expiryStr?: string,
  ) {
    console.log(
      `Generating token for channel: ${channel}, role: ${role}, tokentype: ${tokentype}, uid: ${uid || '0'}, expiry: ${expiryStr}`,
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
  @ApiOperation({ summary: 'Get all tasks for an act' })
  @ApiResponse({
    status: 200,
    description: 'List of tasks for the act',
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
  @ApiOperation({ summary: 'Add a new task to an act' })
  @ApiBody({
    description: 'Task data',
    type: CreateTaskDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Task successfully created',
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
  @ApiOperation({ summary: 'Toggle task completion status' })
  @ApiResponse({
    status: 200,
    description: 'Task status toggled',
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
  @ApiOperation({ summary: 'Delete a task from an act' })
  @ApiResponse({
    status: 200,
    description: 'Task successfully deleted',
    schema: {
      example: { message: 'Task successfully deleted' },
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
    summary: 'Apply as Spot Agent',
    description: 'User applies to become a spot agent for an act',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully applied as spot agent candidate',
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
    summary: 'Get all spot agent candidates',
    description:
      'Get list of all candidates who applied to be spot agents for an act',
  })
  @ApiResponse({
    status: 200,
    description: 'List of spot agent candidates with vote counts',
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
    summary: 'Vote for a spot agent candidate',
    description:
      'Vote for a candidate to become a spot agent (only if voting is enabled)',
  })
  @ApiResponse({
    status: 201,
    description: 'Vote successfully cast',
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
    summary: 'Assign a spot agent (Initiator only)',
    description:
      'Initiator assigns a user as spot agent with optional task description',
  })
  @ApiResponse({
    status: 201,
    description: 'Spot agent successfully assigned',
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
    summary: 'Get all assigned spot agents',
    description: 'Get list of all users assigned as spot agents for an act',
  })
  @ApiResponse({
    status: 200,
    description: 'List of assigned spot agents',
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
    summary: 'Remove a spot agent (Initiator only)',
    description: 'Initiator removes an assigned spot agent from the act',
  })
  @ApiResponse({
    status: 200,
    description: 'Spot agent successfully removed',
    schema: {
      example: { message: 'Spot agent removed successfully' },
    },
  })
  async removeSpotAgent(
    @Param('actId') actId: string,
    @Param('spotAgentId') spotAgentId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.actService.removeSpotAgent(+actId, +spotAgentId, req.user.sub);
  }
}
