import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SenderProfilesController } from "./sender-profiles.controller";
import { SenderProfilesService } from "./sender-profiles.service";

@Module({
  imports: [PrismaModule],
  controllers: [SenderProfilesController],
  providers: [SenderProfilesService],
})
export class SenderProfilesModule {}

