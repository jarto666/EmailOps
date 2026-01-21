import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../prisma/prisma.module";
import { SingleSendsController } from "./single-sends.controller";
import { SingleSendsService } from "./single-sends.service";

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: "singleSend" }, { name: "segment" }, { name: "send" })],
  controllers: [SingleSendsController],
  providers: [SingleSendsService],
})
export class SingleSendsModule {}

