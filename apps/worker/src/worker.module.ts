import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { SegmentProcessor } from "./processors/segment.processor";
import { SendProcessor } from "./processors/send.processor";
import { EventsProcessor } from "./processors/events.processor";
import { SingleSendProcessor } from "./processors/single-send.processor";
import { JourneyEnrollmentProcessor } from "./processors/journey-enrollment.processor";
import { JourneyStepProcessor } from "./processors/journey-step.processor";
import { PrismaModule } from "./prisma/prisma.module";
import { join } from "path";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")],
    }),
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
    }),
    BullModule.registerQueue(
      { name: "singleSend" },
      { name: "segment" },
      { name: "send" },
      { name: "journey" },
      { name: "events" }
    ),
  ],
  providers: [
    SingleSendProcessor,
    SegmentProcessor,
    SendProcessor,
    JourneyEnrollmentProcessor,
    JourneyStepProcessor,
    EventsProcessor,
  ],
})
export class WorkerModule {}
