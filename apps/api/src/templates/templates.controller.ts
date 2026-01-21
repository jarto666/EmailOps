import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TemplatesService } from "./templates.service";
import { CreateTemplateDto, UpdateTemplateDto } from "./dto/template.dto";

@ApiTags('templates')
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.templates.create(dto);
  }

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.templates.list(workspaceId);
  }

  @Get(":id")
  get(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.templates.get(workspaceId, id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateTemplateDto
  ) {
    return this.templates.update(workspaceId, id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.templates.remove(workspaceId, id);
  }
}

