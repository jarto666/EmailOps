import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../prisma/prisma.module";
import { SuppressionModule } from "../suppression/suppression.module";
import { SingleSendProcessor } from "./single-send.processor";
import { SegmentProcessor } from "./segment.processor";
import { SendProcessor } from "./send.processor";
import { EventsProcessor } from "./events.processor";
import { CollisionService } from "./services/collision.service";

@Module({
  imports: [
    PrismaModule,
    SuppressionModule,
    BullModule.registerQueue(
      { name: "singleSend" },
      { name: "segment" },
      { name: "send" },
      { name: "events" }
    ),
  ],
  providers: [
    // Services
    CollisionService,
    // Processors
    SingleSendProcessor,
    SegmentProcessor,
    SendProcessor,
    EventsProcessor,
  ],
  exports: [CollisionService],
})
export class ProcessorsModule {}
