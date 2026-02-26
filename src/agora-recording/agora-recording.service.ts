import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

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
  private readonly recordingsPath: string;

  // AWS S3 для Agora Cloud Recording
  private readonly s3Client: S3Client;
  private readonly s3Bucket: string;
  private readonly s3Prefix: string;
  private readonly s3Region: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.appId = this.configService.get<string>('AGORA_APP_ID');
    this.customerId = this.configService.get<string>('AGORA_CUSTOMER_ID');
    this.customerSecret = this.configService.get<string>(
      'AGORA_CUSTOMER_SECRET',
    );
    this.recordingsPath = path.join(process.cwd(), 'recordings');

    // Инициализация AWS S3 клиента для Agora Cloud Recording
    this.s3Bucket = this.configService.get<string>('AWS_S3_BUCKET');
    this.s3Prefix = this.configService.get<string>('AWS_S3_PREFIX', 'meract');
    this.s3Region = this.configService.get<string>(
      'AWS_S3_REGION',
      'us-east-1',
    );
    this.s3Client = new S3Client({
      region: this.s3Region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>('AWS_S3_SECRET_KEY'),
      },
    });

    this.ensureRecordingsDirectory();
    this.logger.log('AWS S3 Client initialized for recordings');
  }

  /**
   * Создать папку для записей если не существует
   */
  private async ensureRecordingsDirectory(): Promise<void> {
    try {
      if (!fs.existsSync(this.recordingsPath)) {
        await mkdir(this.recordingsPath, { recursive: true });
        this.logger.log(`Created recordings directory: ${this.recordingsPath}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create recordings directory: ${error.message}`,
      );
    }
  }

  /**
   * Тест загрузки в S3 - проверка что IAM креды работают
   */
  async testS3Upload(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const testKey = `${this.s3Prefix}/test-upload-${Date.now()}.txt`;
    const testContent = `Test upload at ${new Date().toISOString()}`;

    try {
      // Попытка загрузить тестовый файл
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: testKey,
          Body: testContent,
          ContentType: 'text/plain',
        }),
      );

      this.logger.log(`Test upload successful: ${testKey}`);

      // Попытка прочитать файл обратно
      const getResult = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: testKey,
        }),
      );

      // Удалить тестовый файл
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: testKey,
        }),
      );

      return {
        success: true,
        message: 'S3 upload/read/delete test passed!',
        details: {
          bucket: this.s3Bucket,
          region: this.s3Region,
          testKey,
        },
      };
    } catch (error) {
      this.logger.error(`S3 test failed: ${error.message}`);
      return {
        success: false,
        message: `S3 test failed: ${error.message}`,
        details: {
          bucket: this.s3Bucket,
          region: this.s3Region,
          error: error.name,
          code: error.Code || error.$metadata?.httpStatusCode,
        },
      };
    }
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
              vendor: 1, // 1: Amazon S3
              region: 6, // 6: EU_CENTRAL_1 (Frankfurt)
              bucket: this.s3Bucket,
              accessKey: this.configService.get<string>('AWS_S3_ACCESS_KEY'),
              secretKey: this.configService.get<string>('AWS_S3_SECRET_KEY'),
              fileNamePrefix: [
                this.s3Prefix,
                'recordings',
                channelName.replace('act_', ''),
              ],
              sseType: 0, // 0: No encryption, explicit
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

      // Логируем конфигурацию для отладки
      const accessKey = this.configService.get<string>('AWS_S3_ACCESS_KEY');
      const secretKey = this.configService.get<string>('AWS_S3_SECRET_KEY');
      this.logger.debug(
        `S3 Config: bucket=${this.s3Bucket}, prefix=${this.s3Prefix}, region=6 (eu-central-1), ` +
          `accessKey=${accessKey ? accessKey.substring(0, 4) + '***' : 'MISSING'}, ` +
          `secretKey=${secretKey ? '***' + secretKey.slice(-4) : 'MISSING'}`,
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
   * Сохраняем URL файла из AWS S3 в БД
   */
  async handleRecordingCompleted(
    actId: number,
    fileList: any[],
  ): Promise<void> {
    try {
      const act = await this.prisma.act.findUnique({
        where: { id: actId },
        select: {
          id: true,
          title: true,
          recordingStatus: true,
        },
      });

      if (!act) {
        this.logger.warn(`Act ${actId} not found when handling uploaded event`);
        return;
      }

      if (!fileList || fileList.length === 0) {
        this.logger.warn(`No files in uploaded event for act ${actId}`);
        return;
      }

      this.logger.log(
        `Received uploaded event for act ${actId}. Files count: ${fileList.length}`,
      );

      // Логируем все файлы
      fileList.forEach((file, index) => {
        this.logger.debug(
          `File ${index + 1}: name=${file.fileName}, size=${file.size || 'unknown'}`,
        );
      });

      // Agora Cloud Recording сохраняет HLS: ищем m3u8 плейлист (финальный с наибольшим индексом)
      const m3u8Files = fileList.filter((f) => f.fileName?.endsWith('.m3u8'));
      let mainFile = m3u8Files.sort((a, b) => {
        // Сортируем по индексу в имени файла (например _5.m3u8 > _4.m3u8)
        const matchA = a.fileName?.match(/_(\d+)\.m3u8$/);
        const matchB = b.fileName?.match(/_(\d+)\.m3u8$/);
        const indexA = matchA ? parseInt(matchA[1]) : 0;
        const indexB = matchB ? parseInt(matchB[1]) : 0;
        return indexB - indexA; // Наибольший индекс первый
      })[0];

      if (!mainFile) {
        mainFile = fileList[0];
      }

      if (!mainFile?.fileName) {
        this.logger.error(`No valid fileName for act ${actId}`);
        return;
      }

      // Формируем URL записи в AWS S3
      const recordingUrl = `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${mainFile.fileName}`;

      // Обновляем БД
      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingUrl,
          recordingStatus: 'completed',
        },
      });

      this.logger.log(
        `Recording completed for act ${actId}. URL: ${recordingUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle recording for act ${actId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Обработка session_exit (eventType 11) - fallback если eventType 31 не пришёл
   * Ищем файлы в S3 по известному prefix
   */
  async handleSessionExit(
    actId: number,
    sid: string,
    channelName: string,
  ): Promise<void> {
    try {
      // Проверяем, не обработана ли уже запись
      const act = await this.prisma.act.findUnique({
        where: { id: actId },
        select: {
          id: true,
          recordingStatus: true,
          recordingUrl: true,
        },
      });

      if (!act) {
        this.logger.warn(`Act ${actId} not found for session exit`);
        return;
      }

      // Если запись уже обработана (eventType 31 пришёл раньше), пропускаем
      if (act.recordingStatus === 'completed' && act.recordingUrl) {
        this.logger.log(
          `Act ${actId} already has recording URL, skipping session exit handler`,
        );
        return;
      }

      // Формируем prefix для поиска в S3
      // Agora сохраняет файлы в формате: {prefix}/recordings/{actId}/{sid}_xxx.mp4
      const actIdFromChannel = channelName.replace('act_', '');
      const searchPrefix = `${this.s3Prefix}/recordings/${actIdFromChannel}/`;

      this.logger.log(
        `Searching for recordings in S3 with prefix: ${searchPrefix}`,
      );

      // Retry логика: S3 имеет eventual consistency, файлы могут появиться с задержкой
      const maxRetries = 5;
      const retryDelayMs = 3000; // 3 секунды между попытками
      let response: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Ждём перед проверкой (кроме первой попытки можно сразу, но лучше подождать)
        if (attempt > 1) {
          this.logger.log(
            `Retry ${attempt}/${maxRetries}: waiting ${retryDelayMs}ms...`,
          );
        }
        await new Promise((resolve) =>
          setTimeout(resolve, attempt === 1 ? 2000 : retryDelayMs),
        );

        // Ищем файлы в S3
        const command = new ListObjectsV2Command({
          Bucket: this.s3Bucket,
          Prefix: searchPrefix,
        });

        response = await this.s3Client.send(command);

        if (response.Contents && response.Contents.length > 0) {
          this.logger.log(
            `Found ${response.Contents.length} files for act ${actId} on attempt ${attempt}`,
          );
          break;
        }

        if (attempt === maxRetries) {
          this.logger.warn(
            `No recordings found in S3 for act ${actId} after ${maxRetries} attempts`,
          );

          // Обновляем статус на failed
          await this.prisma.act.update({
            where: { id: actId },
            data: {
              recordingStatus: 'failed',
            },
          });
          return;
        }
      }

      if (!response?.Contents || response.Contents.length === 0) {
        return;
      }

      // Agora Cloud Recording сохраняет HLS формат: .ts (сегменты) и .m3u8 (плейлисты)
      // Ищем m3u8 плейлист с нужным sid (финальный плейлист имеет наибольший индекс)
      const m3u8Files = response.Contents.filter(
        (obj) => obj.Key?.endsWith('.m3u8') && obj.Key?.includes(sid),
      );

      let mainFile = m3u8Files.sort(
        (a, b) =>
          new Date(b.LastModified || 0).getTime() -
          new Date(a.LastModified || 0).getTime(),
      )[0];

      // Если не нашли с sid, берём последний m3u8 файл
      if (!mainFile) {
        const allM3u8 = response.Contents.filter((obj) =>
          obj.Key?.endsWith('.m3u8'),
        );
        mainFile = allM3u8.sort(
          (a, b) =>
            new Date(b.LastModified || 0).getTime() -
            new Date(a.LastModified || 0).getTime(),
        )[0];
      }

      if (!mainFile?.Key) {
        this.logger.warn(`No M3U8 playlist found in S3 for act ${actId}`);
        return;
      }

      // Формируем URL
      const recordingUrl = `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${mainFile.Key}`;

      // Обновляем БД
      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingUrl,
          recordingStatus: 'completed',
        },
      });

      this.logger.log(
        `Recording found via session exit for act ${actId}. URL: ${recordingUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle session exit for act ${actId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Сохранить запись стрима локально
   */
  async saveRecordingLocally(
    actId: number,
    actTitle: string,
    recordingData: Buffer,
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `act_${actId}_${actTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.mp4`;
      const filePath = path.join(this.recordingsPath, filename);

      await writeFile(filePath, recordingData);

      this.logger.log(`Recording saved locally: ${filename}`);

      // Обновляем путь в БД
      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingUrl: `/recordings/${filename}`,
          recordingStatus: 'completed',
        },
      });

      return filename;
    } catch (error) {
      this.logger.error(`Failed to save recording locally: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить список всех записей
   */
  async getAllRecordings(): Promise<any[]> {
    try {
      const files = await readdir(this.recordingsPath);
      const recordings = [];

      for (const file of files) {
        if (file.endsWith('.mp4')) {
          const filePath = path.join(this.recordingsPath, file);
          const stats = await stat(filePath);

          // Парсим actId из имени файла
          const match = file.match(/^act_(\d+)_/);
          const actId = match ? parseInt(match[1]) : null;

          recordings.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            actId,
            url: `/recordings/${file}`,
          });
        }
      }

      return recordings.sort(
        (a, b) => b.created.getTime() - a.created.getTime(),
      );
    } catch (error) {
      this.logger.error(`Failed to get recordings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить записи конкретного акта
   */
  async getActRecordings(actId: number): Promise<any[]> {
    try {
      const allRecordings = await this.getAllRecordings();
      return allRecordings.filter((r) => r.actId === actId);
    } catch (error) {
      this.logger.error(`Failed to get act recordings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Удалить запись
   */
  async deleteRecording(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.recordingsPath, filename);

      if (fs.existsSync(filePath)) {
        await unlink(filePath);
        this.logger.log(`Recording deleted: ${filename}`);
      } else {
        throw new Error(`Recording file not found: ${filename}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить путь к файлу записи
   */
  getRecordingPath(filename: string): string {
    return path.join(this.recordingsPath, filename);
  }

  /**
   * Получить статистику по записям
   */
  async getRecordingsStats(): Promise<any> {
    try {
      const recordings = await this.getAllRecordings();
      const totalSize = recordings.reduce((sum, r) => sum + r.size, 0);
      const totalCount = recordings.length;

      return {
        totalCount,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        recordings: recordings.slice(0, 10), // последние 10
      };
    } catch (error) {
      this.logger.error(`Failed to get recordings stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Форматировать размер файла
   */
  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // ==================== S3 STORAGE METHODS ====================

  /**
   * Загрузить запись в AWS S3
   */
  async uploadToS3(
    actId: number,
    actTitle: string,
    fileBuffer: Buffer,
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `act_${actId}_${actTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.mp4`;
      const s3Key = `${this.s3Prefix}/recordings/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'video/mp4',
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded to AWS S3: ${s3Key}`);

      // Формируем AWS S3 URL
      const s3Url = `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${s3Key}`;
      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingUrl: s3Url,
          recordingStatus: 'completed',
        },
      });

      return s3Key;
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить список всех записей из AWS S3
   */
  async getAllRecordingsFromS3(): Promise<any[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.s3Bucket,
        Prefix: `${this.s3Prefix}/recordings/`,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      // Agora Cloud Recording сохраняет в HLS формате: .ts (видео-сегменты) и .m3u8 (плейлисты)
      const recordings = await Promise.all(
        response.Contents.filter(
          (obj) =>
            obj.Key.endsWith('.ts') ||
            obj.Key.endsWith('.m3u8') ||
            obj.Key.endsWith('.mp4'),
        ).map(async (obj) => {
          const filename = obj.Key.split('/').pop();
          // Формат: {sid}_act_{actId}_timestamp.ts или {sid}_act_{actId}_timestamp_N.m3u8
          const match = filename.match(/_act_(\d+)_/);
          const actId = match ? parseInt(match[1]) : null;

          return {
            key: obj.Key,
            filename,
            size: obj.Size,
            lastModified: obj.LastModified,
            actId,
            url: `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${obj.Key}`,
          };
        }),
      );

      return recordings.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime(),
      );
    } catch (error) {
      this.logger.error(`Failed to list S3 recordings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить записи конкретного акта из S3
   */
  async getActRecordingsFromS3(actId: number): Promise<any[]> {
    try {
      const allRecordings = await this.getAllRecordingsFromS3();
      return allRecordings.filter((r) => r.actId === actId);
    } catch (error) {
      this.logger.error(
        `Failed to get act recordings from S3: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Получить presigned URL для скачивания из S3
   */
  async getS3DownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client as any, command, {
        expiresIn,
      });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить стрим из S3
   */
  async getS3Stream(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response.Body as Readable;
    } catch (error) {
      this.logger.error(`Failed to get S3 stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Удалить запись из S3
   */
  async deleteFromS3(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete from S3: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить статистику по S3 записям
   */
  async getS3RecordingsStats(): Promise<any> {
    try {
      const recordings = await this.getAllRecordingsFromS3();
      const totalSize = recordings.reduce((sum, r) => sum + (r.size || 0), 0);
      const totalCount = recordings.length;

      return {
        totalCount,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        recordings: recordings.slice(0, 10), // последние 10
      };
    } catch (error) {
      this.logger.error(`Failed to get S3 stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Скачать файл из S3 в локальную папку
   */
  async downloadFromS3ToLocal(key: string): Promise<string> {
    try {
      const stream = await this.getS3Stream(key);
      const filename = key.split('/').pop();
      const localPath = path.join(this.recordingsPath, filename);

      const writeStream = fs.createWriteStream(localPath);
      await new Promise((resolve, reject) => {
        stream.pipe(writeStream);
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      this.logger.log(`Downloaded from S3 to local: ${filename}`);
      return localPath;
    } catch (error) {
      this.logger.error(`Failed to download from S3: ${error.message}`);
      throw error;
    }
  }
}
