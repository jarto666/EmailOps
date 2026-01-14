import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { JourneysController } from "./journeys.controller";
import { JourneysService } from "./journeys.service";

@Module({
  imports: [PrismaModule],
  controllers: [JourneysController],
  providers: [JourneysService],
})
export class JourneysModule {}

