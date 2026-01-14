import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto, TriggerCampaignDto, UpdateCampaignDto } from "./dto/campaign.dto";

@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaigns.create(dto);
  }

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.campaigns.list(workspaceId);
  }

  @Get(":id")
  get(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.campaigns.get(workspaceId, id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() dto: UpdateCampaignDto
  ) {
    return this.campaigns.update(workspaceId, id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.campaigns.remove(workspaceId, id);
  }

  @Post(":id/trigger")
  trigger(
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
    @Body() _dto: TriggerCampaignDto
  ) {
    return this.campaigns.trigger(workspaceId, id);
  }
}

