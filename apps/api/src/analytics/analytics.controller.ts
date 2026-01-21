import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Query('workspaceId') workspaceId: string) {
    return this.analyticsService.getOverview(workspaceId);
  }

  @Get('daily')
  getDailyMetrics(
    @Query('workspaceId') workspaceId: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getDailyMetrics(
      workspaceId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('recent-campaigns')
  getRecentCampaigns(
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getRecentCampaigns(
      workspaceId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('campaigns/:id')
  getCampaignStats(
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.analyticsService.getCampaignStats(workspaceId, id);
  }

  @Get('skip-reasons')
  getSkipReasonBreakdown(
    @Query('workspaceId') workspaceId: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getSkipReasonBreakdown(
      workspaceId,
      days ? parseInt(days, 10) : 7,
    );
  }
}
