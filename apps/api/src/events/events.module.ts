import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../prisma/prisma.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: "journey" })],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}

