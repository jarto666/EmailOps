import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailConnectorsController } from "./email-connectors.controller";
import { EmailConnectorsService } from "./email-connectors.service";

@Module({
  imports: [PrismaModule],
  controllers: [EmailConnectorsController],
  providers: [EmailConnectorsService],
})
export class EmailConnectorsModule {}

