import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  // Enable rawBody so event ingestion can verify request signatures against the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // OpenAPI / Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("EmailOps API")
    .setDescription(
      "SQL-first email orchestration platform. " +
      "EmailOps enables you to build dynamic email campaigns using SQL queries to define audiences."
    )
    .setVersion("1.0")
    .addTag("campaigns", "Single send campaign management")
    .addTag("campaign-groups", "Campaign grouping and collision detection")
    .addTag("templates", "Email template management")
    .addTag("segments", "SQL-based audience segments")
    .addTag("suppressions", "Email suppression management")
    .addTag("connectors", "Data and email provider connectors")
    .addTag("webhooks", "Email provider webhook handlers")
    .addTag("analytics", "Campaign analytics and metrics")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    customSiteTitle: "EmailOps API Documentation",
    customfavIcon: "https://nestjs.com/img/logo_text.svg",
    customCss: ".swagger-ui .topbar { display: none }",
  });

  await app.listen(process.env.PORT || 3300);
  console.log(`API running on port ${process.env.PORT || 3300}`);
  console.log(`API docs available at http://localhost:${process.env.PORT || 3300}/api/docs`);
}
bootstrap();
