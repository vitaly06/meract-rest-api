import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';

interface AcquireResponse {
  resourceId: string;
}

interface StartResponse {
  resourceId: string;
  sid: string;
}

@Injectable()
export class AgoraRecordingService {
  private readonly logger = new Logger(AgoraRecordingService.name);
  private readonly baseUrl = 'https://api.agora.io/v1/apps';
  private readonly appId: string;
  private readonly customerId: string;
  private readonly customerSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.appId = this.configService.get<string>('AGORA_APP_ID');
    this.customerId = this.configService.get<string>('AGORA_CUSTOMER_ID');
    this.customerSecret = this.configService.get<string>(
      'AGORA_CUSTOMER_SECRET',
    );
  }

  /**
   * Получить базовую авторизацию для Agora REST API
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.customerId}:${this.customerSecret}`,
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Шаг 1: Acquire - получение resource ID
   */
  async acquire(channelName: string, uid: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/${this.appId}/cloud_recording/acquire`;

      const response = await axios.post<AcquireResponse>(
        url,
        {
          cname: channelName,
          uid: uid,
          clientRequest: {
            resourceExpiredHour: 24,
          },
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(
        `Acquired resource ID: ${response.data.resourceId} for channel: ${channelName}`,
      );
      return response.data.resourceId;
    } catch (error) {
      this.logger.error(
        `Failed to acquire resource: ${error.response?.data || error.message}`,
      );
      throw error;
    }
  }

  /**
   * Шаг 2: Start - запуск записи
   */
  async startRecording(
    resourceId: string,
    channelName: string,
    uid: string,
    token: string,
  ): Promise<{ resourceId: string; sid: string }> {
    try {
      const url = `${this.baseUrl}/${this.appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`;

      const response = await axios.post<StartResponse>(
        url,
        {
          cname: channelName,
          uid: uid,
          clientRequest: {
            token: token,
            recordingConfig: {
              maxIdleTime: 30,
              streamTypes: 2, // 0: audio only, 1: video only, 2: audio and video
              channelType: 0, // 0: communication, 1: live broadcast
              videoStreamType: 0, // 0: high stream, 1: low stream
              subscribeUidGroup: 0, // 0: subscribe to all UIDs
            },
            storageConfig: {
              vendor: 2, // 2: Amazon S3
              region: 0, // 0: US_EAST_1 for S3
              bucket: 'agora-recording',
              accessKey: 'dummy',
              secretKey: 'dummy',
              fileNamePrefix: ['recordings', channelName.replace('act_', '')],
            },
          },
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(
        `Started recording - SID: ${response.data.sid} for channel: ${channelName}`,
      );

      return {
        resourceId: response.data.resourceId,
        sid: response.data.sid,
      };
    } catch (error) {
      this.logger.error(
        `Failed to start recording: ${JSON.stringify(error.response?.data || error.message)}`,
      );
      throw error;
    }
  }

  /**
   * Шаг 3: Stop - остановка записи
   */
  async stopRecording(
    resourceId: string,
    sid: string,
    channelName: string,
    uid: string,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;

      const response = await axios.post(
        url,
        {
          cname: channelName,
          uid: uid,
          clientRequest: {},
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Stopped recording - SID: ${sid}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to stop recording: ${error.response?.data || error.message}`,
      );
      throw error;
    }
  }

  /**
   * Query - проверка статуса записи
   */
  async queryRecording(resourceId: string, sid: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;

      const response = await axios.get(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to query recording: ${error.response?.data || error.message}`,
      );
      throw error;
    }
  }

  /**
   * Обработка webhook от Agora о завершении записи
   */
  async handleRecordingCompleted(
    actId: number,
    fileList: any[],
  ): Promise<void> {
    try {
      // Формируем URL записи (первый файл из списка)
      const recordingUrl =
        fileList && fileList.length > 0 ? fileList[0].fileName : null;

      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingUrl,
          recordingStatus: 'completed',
        },
      });

      this.logger.log(
        `Recording completed for act ${actId}, URL: ${recordingUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update act with recording URL: ${error.message}`,
      );
      throw error;
    }
  }
}
