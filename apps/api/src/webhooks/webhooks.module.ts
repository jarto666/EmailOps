import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { SesWebhookController } from "./ses-webhook.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: "events" }),
  ],
  controllers: [SesWebhookController],
})
export class WebhooksModule {}
