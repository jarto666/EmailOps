import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get workspace settings' })
  getSettings(@Query('workspaceId') workspaceId: string) {
    return this.settingsService.getSettings(workspaceId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update workspace settings' })
  updateSettings(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(workspaceId, dto);
  }
}
