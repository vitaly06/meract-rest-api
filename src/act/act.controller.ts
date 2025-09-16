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
    type: CreateActRequest,
    description: 'Act creation data with optional preview image',
    schema: {
      type: 'object',
      required: [
        'title',
        'userId',
        // 'categoryId',
        'type',
        'format',
        'heroMethods',
        'navigatorMethods',
        'biddingTime',
      ],
      properties: {
        title: { type: 'string', example: 'CS 2 Faceit Stream' },
        sequel: { type: 'string', example: 'Season 1', nullable: true },
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
        userId: { type: 'number', example: 2 },
        // categoryId: { type: 'number', example: 2 },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Optional preview image',
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
  @Post('create-act')
  @UseInterceptors(FileInterceptor('photo'))
  async createAct(
    @Body() dto: CreateActRequest,
    @UploadedFile() photo?: Multer.File,
  ) {
    return await this.actService.createAct(dto, photo?.filename);
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
  @Get('token/:channel/:role/:tokentype/:uid')
  async getToken(
    @Param('channel') channel: string,
    @Param('role') role: string,
    @Param('tokentype') tokentype: string,
    @Param('uid') uid?: string,
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
}
