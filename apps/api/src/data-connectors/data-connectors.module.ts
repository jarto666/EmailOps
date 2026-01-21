import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DataConnectorsController } from "./data-connectors.controller";
import { DataConnectorsService } from "./data-connectors.service";

@Module({
  imports: [PrismaModule],
  controllers: [DataConnectorsController],
  providers: [DataConnectorsService],
})
export class DataConnectorsModule {}

