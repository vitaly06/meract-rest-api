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
} from '@nestjs/common';
import { AgoraRecordingService } from './agora-recording.service';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@ApiTags('Agora Recording')
@Controller('agora-recording')
export class AgoraRecordingController {
  private readonly logger = new Logger(AgoraRecordingController.name);

  constructor(private readonly agoraRecordingService: AgoraRecordingService) {}

  /**
   * Webhook для событий Agora Cloud Recording
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook for Agora Cloud Recording events' })
  async handleWebhook(@Body() payload: any, @Res() res: Response) {
    this.logger.log(`Received webhook: ${JSON.stringify(payload)}`);

    try {
      const { eventType, payload: eventPayload } = payload;

      // Event 31 = File uploaded to S3
      if (eventType === '31' || eventType === 31) {
        const { cname, sid, fileList } = eventPayload;
        const actId = parseInt(cname.split('_')[1]);

        if (actId && fileList) {
          this.logger.log(`Event 31: Recording uploaded for act ${actId}`);
          await this.agoraRecordingService.handleRecordingCompleted(
            actId,
            fileList,
          );
        }
      }

      // Event 11 = Session exit (fallback if event 31 doesn't arrive)
      if (eventType === '11' || eventType === 11) {
        const { cname, sid, details } = eventPayload;
        const actId = parseInt(cname.split('_')[1]);

        if (details?.exitStatus === 0 && actId) {
          this.logger.log(
            `Event 11: Session ended successfully for act ${actId}, sid: ${sid}`,
          );
          await this.agoraRecordingService.handleSessionExit(actId, sid, cname);
        }
      }

      res.status(200).json({ status: 'ok', received: true });
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      res.status(200).json({ status: 'ok', received: true });
    }
  }

  /**
   * Получить все записи из S3
   */
  @Get('recordings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all recordings from S3' })
  @ApiResponse({
    status: 200,
    description: 'List of all recordings',
  })
  async getAllRecordings() {
    return this.agoraRecordingService.getAllRecordingsFromS3();
  }

  /**
   * Статистика записей
   */
  @Get('recordings/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get recordings statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics about recordings',
  })
  async getRecordingsStats() {
    return this.agoraRecordingService.getS3RecordingsStats();
  }

  /**
   * Записи конкретного акта
   */
  @Get('recordings/act/:actId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get recordings for specific act' })
  @ApiResponse({
    status: 200,
    description: 'List of recordings for the act',
  })
  async getActRecordings(@Param('actId') actId: string) {
    return this.agoraRecordingService.getActRecordingsFromS3(+actId);
  }

  /**
   * Получить presigned URL для скачивания
   */
  @Get('recordings/download-url/:key')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get presigned download URL for recording' })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL for downloading',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  async getDownloadUrl(@Param('key') key: string) {
    const url = await this.agoraRecordingService.getS3DownloadUrl(
      decodeURIComponent(key),
      3600,
    );
    return { url, expiresIn: 3600 };
  }

  /**
   * Стриминг записи (для HLS плеера)
   */
  @Get('recordings/stream/:key')
  @ApiOperation({ summary: 'Stream recording (for video player)' })
  @ApiResponse({
    status: 200,
    description: 'Recording video stream',
  })
  async streamRecording(@Param('key') key: string, @Res() res: Response) {
    try {
      const decodedKey = decodeURIComponent(key);
      const stream = await this.agoraRecordingService.getS3Stream(decodedKey);

      // Определяем Content-Type по расширению
      if (decodedKey.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (decodedKey.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      } else {
        res.setHeader('Content-Type', 'video/mp4');
      }
      res.setHeader('Accept-Ranges', 'bytes');

      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Failed to stream recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Удалить запись
   */
  @Delete('recordings/:key')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete recording' })
  @ApiResponse({
    status: 200,
    description: 'Recording successfully deleted',
  })
  async deleteRecording(@Param('key') key: string) {
    const decodedKey = decodeURIComponent(key);
    await this.agoraRecordingService.deleteFromS3(decodedKey);
    return { message: 'Recording successfully deleted', key: decodedKey };
  }
}
