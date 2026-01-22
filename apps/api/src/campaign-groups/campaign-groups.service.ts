import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignGroupDto, UpdateCampaignGroupDto } from './dto';
import { CollisionPolicy } from '@prisma/client';

@Injectable()
export class CampaignGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateCampaignGroupDto) {
    // Ensure workspace exists
    await this.prisma.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: 'Default Workspace' },
    });

    // Check for duplicate name
    const existing = await this.prisma.campaignGroup.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Campaign group "${dto.name}" already exists`);
    }

    return this.prisma.campaignGroup.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        collisionWindow: dto.collisionWindow ?? 86400,
        collisionPolicy: dto.collisionPolicy ?? CollisionPolicy.HIGHEST_PRIORITY_WINS,
      },
    });
  }

  async findAll(workspaceId: string) {
    const groups = await this.prisma.campaignGroup.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            singleSends: true,
            sendLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return groups.map((group) => ({
      ...group,
      campaignsCount: group._count.singleSends,
      totalSends: group._count.sendLogs,
      _count: undefined,
    }));
  }

  async findOne(workspaceId: string, id: string) {
    const group = await this.prisma.campaignGroup.findFirst({
      where: { id, workspaceId },
      include: {
        singleSends: {
          select: {
            id: true,
            name: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { priority: 'asc' },
        },
        _count: {
          select: {
            sendLogs: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Campaign group not found`);
    }

    // Get collision stats for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const collisionStats = await this.prisma.sendLog.groupBy({
      by: ['singleSendId'],
      where: {
        campaignGroupId: id,
        sentAt: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    return {
      ...group,
      totalSends: group._count.sendLogs,
      recentSendsByDay: collisionStats,
      _count: undefined,
    };
  }

  async update(workspaceId: string, id: string, dto: UpdateCampaignGroupDto) {
    const existing = await this.prisma.campaignGroup.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Campaign group not found`);
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.campaignGroup.findUnique({
        where: {
          workspaceId_name: {
            workspaceId,
            name: dto.name,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Campaign group "${dto.name}" already exists`);
      }
    }

    return this.prisma.campaignGroup.update({
      where: { id },
      data: dto,
    });
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.campaignGroup.findFirst({
      where: { id, workspaceId },
      include: {
        _count: {
          select: { singleSends: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Campaign group not found`);
    }

    // Don't allow deletion if there are campaigns using this group
    if (existing._count.singleSends > 0) {
      throw new ConflictException(
        `Cannot delete campaign group with ${existing._count.singleSends} associated campaigns. ` +
        `Remove campaigns from this group first.`
      );
    }

    await this.prisma.campaignGroup.delete({
      where: { id },
    });

    return { success: true };
  }

  // Get collision stats for analytics
  async getCollisionStats(workspaceId: string, groupId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(sent_at) as date, COUNT(*) as count
      FROM "SendLog"
      WHERE campaign_group_id = ${groupId}
        AND workspace_id = ${workspaceId}
        AND sent_at >= ${startDate}
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `;

    return stats.map((s) => ({
      date: s.date,
      count: Number(s.count),
    }));
  }
}
