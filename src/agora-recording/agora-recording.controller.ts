import {
  Body,
  Controller,
  Post,
  Logger,
  Get,
  Delete,
  Param,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AgoraRecordingService } from './agora-recording.service';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@ApiTags('Agora Recording Webhook')
@Controller('agora-recording')
export class AgoraRecordingController {
  private readonly logger = new Logger(AgoraRecordingController.name);

  constructor(private readonly agoraRecordingService: AgoraRecordingService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook for Agora Cloud Recording events' })
  async handleWebhook(@Body() payload: any) {
    this.logger.log(`Received webhook: ${JSON.stringify(payload)}`);

    try {
      const { eventType, payload: eventPayload } = payload;

      // Обрабатываем событие завершения записи
      if (eventType === '31' || eventType === 31) {
        // Event 31 = Recording completed
        const { cname, sid, fileList } = eventPayload;

        // Находим акт по channel name (cname должен содержать actId)
        const actId = parseInt(cname.split('_')[1]); // Предполагаем формат "act_123"

        if (actId && fileList) {
          await this.agoraRecordingService.handleRecordingCompleted(
            actId,
            fileList,
          );
        }
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  @Get('recordings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all recordings' })
  @ApiResponse({
    status: 200,
    description: 'List of all recordings',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
          size: { type: 'number' },
          created: { type: 'string', format: 'date-time' },
          modified: { type: 'string', format: 'date-time' },
          actId: { type: 'number', nullable: true },
          url: { type: 'string' },
        },
      },
    },
  })
  async getAllRecordings() {
    return this.agoraRecordingService.getAllRecordings();
  }

  @Get('recordings/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get recordings statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics about recordings',
    schema: {
      type: 'object',
      properties: {
        totalCount: { type: 'number' },
        totalSize: { type: 'number' },
        totalSizeFormatted: { type: 'string' },
        recordings: { type: 'array' },
      },
    },
  })
  async getRecordingsStats() {
    return this.agoraRecordingService.getRecordingsStats();
  }

  @Get('recordings/act/:actId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get recordings for specific act' })
  @ApiResponse({
    status: 200,
    description: 'List of recordings for the act',
  })
  async getActRecordings(@Param('actId') actId: string) {
    return this.agoraRecordingService.getActRecordings(+actId);
  }

  @Get('recordings/download/:filename')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download recording file' })
  @ApiResponse({
    status: 200,
    description: 'Recording file stream',
  })
  async downloadRecording(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = this.agoraRecordingService.getRecordingPath(filename);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Recording file not found');
      }

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      this.logger.error(`Failed to download recording: ${error.message}`);
      throw error;
    }
  }

  @Get('recordings/stream/:filename')
  @ApiOperation({ summary: 'Stream recording file (for video player)' })
  @ApiResponse({
    status: 200,
    description: 'Recording video stream',
  })
  async streamRecording(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = this.agoraRecordingService.getRecordingPath(filename);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Recording file not found');
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Accept-Ranges', 'bytes');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      this.logger.error(`Failed to stream recording: ${error.message}`);
      throw error;
    }
  }

  @Delete('recordings/:filename')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete recording file' })
  @ApiResponse({
    status: 200,
    description: 'Recording successfully deleted',
  })
  async deleteRecording(@Param('filename') filename: string) {
    await this.agoraRecordingService.deleteRecording(filename);
    return { message: 'Recording successfully deleted', filename };
  }
}
