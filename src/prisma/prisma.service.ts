import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, OnModuleInit
{
  async onModuleInit() {
    console.log('Ждём 30 секунд перед подключением Prisma...');
    await new Promise((resolve) => setTimeout(resolve, 30000));
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
