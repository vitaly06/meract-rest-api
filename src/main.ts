import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import type { Express } from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  app.use(cookieParser());

  app.enableCors({
    credentials: true,
    origin: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api');

  // Body size limit
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.use(express.json({ limit: '20mb' }));
  expressApp.use(express.urlencoded({ limit: '20mb', extended: true }));

  // Explicit static mapping for uploads
  expressApp.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Meract REST API')
    .setDescription('Rest API for Meract')
    .setVersion('1.0.0')
    .setContact(
      'Vitaly Sadikov',
      'https://github.com/vitaly06',
      'vitaly.sadikov1@yandex.ru',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
