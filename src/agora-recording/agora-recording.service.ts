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

  // Timeweb S3 (основное хранилище)
  private readonly s3Client: S3Client;
  private readonly s3Bucket: string;

  // AWS S3 (промежуточное хранилище для Agora)
  private readonly awsS3Client: S3Client;
  private readonly awsS3Bucket: string;

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

    // Инициализация Timeweb S3 клиента (основное хранилище)
    this.s3Bucket = this.configService.get<string>('S3_BUCKET');
    this.s3Client = new S3Client({
      region: this.configService.get<string>('S3_REGION', 'ru-1'),
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: true,
    });

    // Инициализация AWS S3 клиента (промежуточное хранилище для Agora)
    this.awsS3Bucket = this.configService.get<string>('AWS_S3_BUCKET');
    this.awsS3Client = new S3Client({
      region: this.configService.get<string>('AWS_S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>('AWS_S3_SECRET_KEY'),
      },
    });

    this.ensureRecordingsDirectory();
    this.logger.log('S3 Clients initialized (Timeweb + AWS)');
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
              vendor: 1, // 1: Amazon S3 (промежуточное хранилище, потом копируем в Timeweb)
              region: 0, // 0: US_EAST_1
              bucket: this.configService.get<string>('AWS_S3_BUCKET'),
              accessKey: this.configService.get<string>('AWS_S3_ACCESS_KEY'),
              secretKey: this.configService.get<string>('AWS_S3_SECRET_KEY'),
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
   * Скачивает файл из AWS S3 и загружает в Timeweb S3
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

      // Ищем mp4 файл (m3u8 сложнее для переноса из-за сегментов)
      let mainFile = fileList.find((f) => f.fileName?.endsWith('.mp4'));
      if (!mainFile) {
        mainFile = fileList[0];
      }

      if (!mainFile?.fileName) {
        this.logger.error(`No valid fileName for act ${actId}`);
        return;
      }

      // Скачиваем файл из AWS S3
      this.logger.log(`Downloading ${mainFile.fileName} from AWS S3...`);
      const fileBuffer = await this.downloadFromAwsS3(mainFile.fileName);

      // Загружаем в Timeweb S3
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newFileName = `act_${actId}_${timestamp}.mp4`;
      const s3Key = `recordings/${newFileName}`;

      this.logger.log(`Uploading to Timeweb S3: ${s3Key}...`);
      await this.uploadBufferToTimewebS3(s3Key, fileBuffer);

      // Формируем URL
      const endpoint = this.configService.get<string>('S3_ENDPOINT');
      const recordingUrl = `${endpoint}/${this.s3Bucket}/${s3Key}`;

      // Обновляем БД
      await this.prisma.act.update({
        where: { id: actId },
        data: {
          recordingUrl,
          recordingStatus: 'completed',
        },
      });

      // Удаляем из AWS S3 (опционально, для экономии места)
      try {
        await this.deleteFromAwsS3(mainFile.fileName);
        this.logger.log(`Deleted ${mainFile.fileName} from AWS S3`);
      } catch (deleteError) {
        this.logger.warn(
          `Failed to delete from AWS S3: ${deleteError.message}`,
        );
      }

      this.logger.log(
        `Recording transferred for act ${actId}. URL: ${recordingUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle recording for act ${actId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Скачать файл из AWS S3
   */
  private async downloadFromAwsS3(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.awsS3Bucket,
      Key: key,
    });

    const response = await this.awsS3Client.send(command);
    const stream = response.Body as Readable;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Загрузить буфер в Timeweb S3
   */
  private async uploadBufferToTimewebS3(
    key: string,
    buffer: Buffer,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: 'video/mp4',
    });

    await this.s3Client.send(command);
  }

  /**
   * Удалить файл из AWS S3
   */
  private async deleteFromAwsS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.awsS3Bucket,
      Key: key,
    });

    await this.awsS3Client.send(command);
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
   * Загрузить запись в S3
   */
  async uploadToS3(
    actId: number,
    actTitle: string,
    fileBuffer: Buffer,
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `act_${actId}_${actTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.mp4`;
      const s3Key = `recordings/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'video/mp4',
        ACL: 'public-read', // Если нужен публичный доступ
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded to S3: ${s3Key}`);

      // Обновляем URL в БД
      const s3Url = `${this.configService.get('S3_ENDPOINT')}/${this.s3Bucket}/${s3Key}`;
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
   * Получить список всех записей из S3
   */
  async getAllRecordingsFromS3(): Promise<any[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.s3Bucket,
        Prefix: 'recordings/',
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      const recordings = await Promise.all(
        response.Contents.filter((obj) => obj.Key.endsWith('.mp4')).map(
          async (obj) => {
            const filename = obj.Key.split('/').pop();
            const match = filename.match(/^act_(\d+)_/);
            const actId = match ? parseInt(match[1]) : null;

            return {
              key: obj.Key,
              filename,
              size: obj.Size,
              lastModified: obj.LastModified,
              actId,
              url: `${this.configService.get('S3_ENDPOINT')}/${this.s3Bucket}/${obj.Key}`,
            };
          },
        ),
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
