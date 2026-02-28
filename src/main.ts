import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';

import type { Express } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Глобальный префикс для всех маршрутов
  app.setGlobalPrefix('api');

  // Увеличиваем лимит на размер тела запроса до 20 МБ
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.use(require('express').json({ limit: '20mb' }));
  expressApp.use(
    require('express').urlencoded({ limit: '20mb', extended: true }),
  );

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
