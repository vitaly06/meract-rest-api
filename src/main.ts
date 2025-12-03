import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    origin: true,
  });
  app.useGlobalPipes(new ValidationPipe());

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
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
