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
        biddingTime: { type: 'string', example: '2025-09-15T12:00:00Z' },
        latitude: {
          type: 'number',
          example: 52.3675734,
          description: 'Latitude coordinate for the stream location',
        },
        longitude: {
          type: 'number',
          example: 4.9041389,
          description: 'Longitude coordinate for the stream location',
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
      example: { message: 'Stream launched successfully', actId: 1 },
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
}
