import { Module } from "@nestjs/common";
import { DemoController } from "./demo.controller";
import { DemoService } from "./demo.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
