import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { GuildModule } from './guild/guild.module';
import { UtilsModule } from './common/utils/utils.module';
import { AdminModule } from './admin/admin.module';
import { ActModule } from './act/act.module';

@Module({
  imports: [
    UserModule,
    ConfigModule,
    AuthModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    GuildModule,
    UtilsModule,
    AdminModule,
    ActModule,
  ],
})
export class AppModule {}
