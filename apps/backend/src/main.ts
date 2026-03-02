import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Allow the Angular dev server (port 4200) and any configured origin.
  app.enableCors({
    origin: process.env['CORS_ORIGIN']?.split(',') ?? 'http://localhost:4200',
    methods: ['GET', 'POST'],
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
