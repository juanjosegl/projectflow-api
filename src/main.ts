import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Render terminates TLS at its proxy; trusting it lets rate limiting see the real client IP.
  app.set('trust proxy', 1);
  // CSP is off because this is a JSON API and CSP would block Swagger UI's inline scripts.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('ProjectFlow API')
    .setDescription(
      'Team task manager: teams with roles, projects, kanban tasks, comments and notifications. ' +
        'Successful responses are wrapped as `{ success, data, timestamp }`.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, swagger),
  );

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
  Logger.log(
    `Listening on port ${port} · API at /api/v1 · docs at /api/docs`,
    'Bootstrap',
  );
}

void bootstrap();
