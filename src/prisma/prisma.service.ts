import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, OnModuleInit
{
  private readonly logger = new Logger(PrismaService.name);
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor() {
    super({
      log: ['error', 'warn'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    try {
      this.logger.log('🔌 Connecting to database...');
      this.logger.log(`DATABASE_URL: postgresql://postgres:***@db:5432/Meract`);

      await this.$connect();

      // Проверка подключения
      const result = await this
        .$queryRaw`SELECT current_user, current_database(), version()`;
      this.logger.log(`✅ Database connected successfully`);
      this.logger.log(`Connected as: ${JSON.stringify(result)}`);

      this.reconnectAttempts = 0;
    } catch (error) {
      this.reconnectAttempts++;
      this.logger.error(
        `❌ Database connection failed (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}): ${error.message}`,
      );

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.logger.log(`Retrying in 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.connectWithRetry();
      } else {
        this.logger.error('❌ Max reconnection attempts reached. Exiting...');
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting from database...');
    await this.$disconnect();
  }
}
