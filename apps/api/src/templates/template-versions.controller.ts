import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  CreateTemplateVersionDto,
  RenderTemplateVersionDto,
  UpdateTemplateVersionDto,
} from "./dto/template-version.dto";
import { TemplateVersionsService } from "./template-versions.service";

@Controller("templates/:templateId/versions")
export class TemplateVersionsController {
  constructor(private readonly versions: TemplateVersionsService) {}

  @Post()
  create(
    @Param("templateId") templateId: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: CreateTemplateVersionDto
  ) {
    return this.versions.create(workspaceId, templateId, dto);
  }

  @Get()
  list(
    @Param("templateId") templateId: string,
    @Query("workspaceId") workspaceId: string
  ) {
    return this.versions.list(workspaceId, templateId);
  }

  @Get(":versionId")
  get(
    @Param("templateId") templateId: string,
    @Param("versionId") versionId: string,
    @Query("workspaceId") workspaceId: string
  ) {
    return this.versions.get(workspaceId, templateId, versionId);
  }

  @Patch(":versionId")
  update(
    @Param("templateId") templateId: string,
    @Param("versionId") versionId: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateTemplateVersionDto
  ) {
    return this.versions.update(workspaceId, templateId, versionId, dto);
  }

  @Post(":versionId/publish")
  publish(
    @Param("templateId") templateId: string,
    @Param("versionId") versionId: string,
    @Query("workspaceId") workspaceId: string
  ) {
    return this.versions.publish(workspaceId, templateId, versionId);
  }

  @Post(":versionId/render")
  render(
    @Param("templateId") templateId: string,
    @Param("versionId") versionId: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: RenderTemplateVersionDto
  ) {
    return this.versions.render(
      workspaceId,
      templateId,
      versionId,
      dto.variables ?? {}
    );
  }
}

