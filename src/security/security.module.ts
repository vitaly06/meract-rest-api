import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { redisStore } from 'cache-manager-redis-yet';
import { join } from 'path';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST'),
            port: configService.get('REDIS_PORT'),
          },
          ttl: +configService.get('CACHE_TTL', 3600) * 1000,
        }),
      }),
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const port = +configService.get('SMTP_PORT');
        return {
          transport: {
            host: configService.get('SMTP_HOST'),
            port: port,
            secure: port === 465,
            auth: {
              user: configService.get('SMTP_USER'),
              pass: configService.get('SMTP_PASSWORD'),
            },
          },
          defaults: { from: 'Meract' },
          template: {
            dir: join(process.cwd(), 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
  ],
  controllers: [SecurityController],
  providers: [SecurityService],
})
export class SecurityModule {}
