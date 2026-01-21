import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TemplateVersionsController } from "./template-versions.controller";
import { TemplatesController } from "./templates.controller";
import { RenderingService } from "./rendering.service";
import { TemplateVersionsService } from "./template-versions.service";
import { TemplatesService } from "./templates.service";

@Module({
  imports: [PrismaModule],
  controllers: [TemplatesController, TemplateVersionsController],
  providers: [TemplatesService, TemplateVersionsService, RenderingService],
})
export class TemplatesModule {}
