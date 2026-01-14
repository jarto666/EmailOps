import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { JourneysService } from "./journeys.service";
import {
  CreateJourneyDto,
  PublishJourneyVersionDto,
  UpdateJourneyDto,
  UpsertJourneyVersionDto,
} from "./dto/journey.dto";

@Controller("journeys")
export class JourneysController {
  constructor(private journeys: JourneysService) {}

  @Post()
  create(@Body() dto: CreateJourneyDto) {
    return this.journeys.create(dto);
  }

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.journeys.list(workspaceId);
  }

  @Get(":id")
  get(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.journeys.get(workspaceId, id);
  }

  @Get(":id/versions/:versionId")
  getVersion(
    @Param("id") id: string,
    @Param("versionId") versionId: string,
    @Query("workspaceId") workspaceId: string
  ) {
    return this.journeys.getVersion(workspaceId, id, versionId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateJourneyDto
  ) {
    return this.journeys.update(workspaceId, id, dto);
  }

  @Post(":id/draft")
  upsertDraft(
    @Param("id") id: string,
    @Body() dto: UpsertJourneyVersionDto
  ) {
    return this.journeys.upsertDraftVersion(dto.workspaceId, id, dto);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string, @Body() dto: PublishJourneyVersionDto) {
    return this.journeys.publish(dto.workspaceId, id);
  }
}

