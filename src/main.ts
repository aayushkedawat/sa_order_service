import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { writeFileSync } from "fs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug"],
  });

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
  console.log(`Order Service running on port ${port}`);
}

bootstrap();
