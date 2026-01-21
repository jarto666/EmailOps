import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CampaignGroupsService } from './campaign-groups.service';
import { CreateCampaignGroupDto, UpdateCampaignGroupDto } from './dto';

@ApiTags('campaign-groups')
@Controller('campaign-groups')
export class CampaignGroupsController {
  constructor(private readonly campaignGroupsService: CampaignGroupsService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateCampaignGroupDto,
  ) {
    return this.campaignGroupsService.create(workspaceId, dto);
  }

  @Get()
  findAll(@Query('workspaceId') workspaceId: string) {
    return this.campaignGroupsService.findAll(workspaceId);
  }

  @Get(':id')
  findOne(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignGroupsService.findOne(workspaceId, id);
  }

  @Patch(':id')
  update(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignGroupDto,
  ) {
    return this.campaignGroupsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignGroupsService.remove(workspaceId, id);
  }

  @Get(':id/stats')
  getCollisionStats(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.campaignGroupsService.getCollisionStats(
      workspaceId,
      id,
      days ? parseInt(days, 10) : 7,
    );
  }
}
