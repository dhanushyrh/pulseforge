import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

// apps/gateway/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin:  ['http://localhost:4000'],   // Vite dev server
    methods: ['GET','POST','PUT','DELETE'],
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    forbidNonWhitelisted: true,
    transform:            true,
  }));

  const config = new DocumentBuilder()
    .setTitle('PulseForge AI')
    .setDescription('Semantic memory for social content')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.GATEWAY_PORT ?? 3000);
  console.log(`Gateway   → http://localhost:${process.env.GATEWAY_PORT ?? 3000}`);
  console.log(`Swagger   → http://localhost:${process.env.GATEWAY_PORT ?? 3000}/api`);
  console.log(`Bull Board→ http://localhost:${process.env.GATEWAY_PORT ?? 3000}/queues`);
}
bootstrap();