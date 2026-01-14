import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { HealthModule } from "./health/health.module";
import { ConnectorsModule } from "./connectors/connectors.module";
import { TemplatesModule } from "./templates/templates.module";
import { SegmentsModule } from "./segments/segments.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { TransactionalModule } from "./transactional/transactional.module";
import { PrismaModule } from "./prisma/prisma.module";
import { join } from "path";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Turbo runs commands from `apps/api`, but the repo's `.env` commonly lives at the repo root.
      // Load both, preferring the local one if present.
      envFilePath: [
        join(process.cwd(), ".env"),
        join(process.cwd(), "../../.env"),
      ],
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
    }),
    HealthModule,
    PrismaModule,
    ConnectorsModule,
    TemplatesModule,
    SegmentsModule,
    CampaignsModule,
    WebhooksModule,
    TransactionalModule,
  ],
})
export class AppModule {}
