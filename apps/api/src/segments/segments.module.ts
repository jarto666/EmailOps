import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SegmentsController } from "./segments.controller";
import { SegmentsService } from "./segments.service";

@Module({
  imports: [PrismaModule],
  controllers: [SegmentsController],
  providers: [SegmentsService],
})
export class SegmentsModule {}
