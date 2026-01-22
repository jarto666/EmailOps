import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto, WorkspaceSettings } from './dto';

// Default settings values
const DEFAULT_SETTINGS: Omit<WorkspaceSettings, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'> = {
  instanceName: 'EmailOps',
  timezone: 'UTC',
  batchSize: 100,
  rateLimitPerSecond: 50,
  collisionWindow: 86400, // 24 hours
  queryTimeout: 30,
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(workspaceId: string): Promise<WorkspaceSettings> {
    // Ensure workspace exists
    await this.prisma.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: 'Default Workspace' },
    });

    // Get or create settings
    const settings = await this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      update: {},
      create: {
        workspaceId,
        ...DEFAULT_SETTINGS,
      },
    });

    return settings;
  }

  async updateSettings(
    workspaceId: string,
    dto: UpdateSettingsDto,
  ): Promise<WorkspaceSettings> {
    // Ensure workspace and settings exist
    await this.getSettings(workspaceId);

    // Update settings
    return this.prisma.workspaceSettings.update({
      where: { workspaceId },
      data: {
        instanceName: dto.instanceName,
        timezone: dto.timezone,
        batchSize: dto.batchSize,
        rateLimitPerSecond: dto.rateLimitPerSecond,
        collisionWindow: dto.collisionWindow,
        queryTimeout: dto.queryTimeout,
      },
    });
  }

  // Helper to get specific settings (used by processors)
  async getBatchSettings(workspaceId: string): Promise<{
    batchSize: number;
    rateLimitPerSecond: number;
  }> {
    const settings = await this.getSettings(workspaceId);
    return {
      batchSize: settings.batchSize,
      rateLimitPerSecond: settings.rateLimitPerSecond,
    };
  }
}
