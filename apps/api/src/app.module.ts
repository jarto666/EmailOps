import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { HealthModule } from "./health/health.module";
import { DataConnectorsModule } from "./data-connectors/data-connectors.module";
import { EmailConnectorsModule } from "./email-connectors/email-connectors.module";
import { SenderProfilesModule } from "./sender-profiles/sender-profiles.module";
import { TemplatesModule } from "./templates/templates.module";
import { SegmentsModule } from "./segments/segments.module";
import { SingleSendsModule } from "./single-sends/single-sends.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { TransactionalModule } from "./transactional/transactional.module";
import { PrismaModule } from "./prisma/prisma.module";
import { CampaignGroupsModule } from "./campaign-groups/campaign-groups.module";
import { ComponentsModule } from "./components/components.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { SuppressionModule } from "./suppression/suppression.module";
import { ProcessorsModule } from "./processors/processors.module";
import { join } from "path";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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

    // Core
    HealthModule,
    PrismaModule,

    // Campaign Groups & Collision
    CampaignGroupsModule,

    // Connectors
    DataConnectorsModule,
    EmailConnectorsModule,
    SenderProfilesModule,

    // Content
    TemplatesModule,
    ComponentsModule,
    SegmentsModule,

    // Campaigns
    SingleSendsModule,

    // Analytics
    AnalyticsModule,

    // Suppressions
    SuppressionModule,

    // Webhooks & Transactional (scaffolded)
    WebhooksModule,
    TransactionalModule,

    // Background job processors
    ProcessorsModule,
  ],
})
export class AppModule {}
