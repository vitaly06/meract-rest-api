import { Body, Controller, Post, Logger } from '@nestjs/common';
import { AgoraRecordingService } from './agora-recording.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

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
}
