import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  // Enable rawBody so event ingestion can verify request signatures against the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.listen(process.env.PORT || 3300);
  console.log(`API running on port ${process.env.PORT || 3300}`);
}
bootstrap();
