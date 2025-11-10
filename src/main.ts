import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { PinoLoggerService } from "./common/observability/logger.service";
import { writeFileSync } from "fs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const config = new DocumentBuilder()
    .setTitle("Order Service API")
    .setDescription("Online Food Delivery - Order Service")
    .setVersion("1.0")
    .addApiKey(
      { type: "apiKey", name: "Idempotency-Key", in: "header" },
      "Idempotency-Key"
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  // Export OpenAPI spec
  writeFileSync("./openapi.yaml", JSON.stringify(document, null, 2));

  const port = process.env.PORT || 8080;
  await app.listen(port);
  logger.log({
    type: "startup",
    message: "Order Service started",
    port,
    environment: process.env.NODE_ENV || "development",
  });
}

bootstrap();
