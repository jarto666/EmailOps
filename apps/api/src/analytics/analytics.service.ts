import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OverviewStats {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  activeCampaigns: number;
  totalSegments: number;
  totalTemplates: number;
}

export interface DailyMetric {
  date: string;
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(workspaceId: string): Promise<OverviewStats> {
    // Get send stats
    const sendStats = await this.prisma.send.groupBy({
      by: ['status'],
      _count: true,
    });

    const statsMap = new Map<string, number>();
    for (const stat of sendStats) {
      statsMap.set(stat.status, stat._count);
    }

    const totalSent = (statsMap.get('SENT') ?? 0) + (statsMap.get('DELIVERED') ?? 0);
    const totalDelivered = statsMap.get('DELIVERED') ?? 0;
    const totalBounced = statsMap.get('BOUNCED') ?? 0;
    const totalFailed = statsMap.get('FAILED') ?? 0;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    // Get counts
    const [activeCampaigns, totalSegments, totalTemplates] = await Promise.all([
      this.prisma.singleSend.count({
        where: { workspaceId, status: { in: ['ACTIVE', 'DRAFT'] } },
      }),
      this.prisma.segment.count({ where: { workspaceId } }),
      this.prisma.template.count({ where: { workspaceId } }),
    ]);

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      totalFailed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      activeCampaigns,
      totalSegments,
      totalTemplates,
    };
  }

  async getDailyMetrics(workspaceId: string, days: number = 30): Promise<DailyMetric[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Try to get from DailyStats first
    const dailyStats = await this.prisma.dailyStats.findMany({
      where: {
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    if (dailyStats.length > 0) {
      return dailyStats.map((stat) => ({
        date: stat.date.toISOString().split('T')[0],
        sent: stat.totalSent,
        delivered: stat.totalDelivered,
        bounced: stat.totalBounced,
        failed: stat.totalFailed,
      }));
    }

    // Fall back to computing from Send table
    const sends = await this.prisma.send.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    // Group by date
    const metricsByDate = new Map<string, DailyMetric>();

    // Initialize all dates
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      metricsByDate.set(dateStr, {
        date: dateStr,
        sent: 0,
        delivered: 0,
        bounced: 0,
        failed: 0,
      });
    }

    // Aggregate sends
    for (const send of sends) {
      const dateStr = send.createdAt.toISOString().split('T')[0];
      const metric = metricsByDate.get(dateStr);
      if (metric) {
        if (send.status === 'SENT' || send.status === 'DELIVERED') {
          metric.sent++;
        }
        if (send.status === 'DELIVERED') {
          metric.delivered++;
        }
        if (send.status === 'BOUNCED') {
          metric.bounced++;
        }
        if (send.status === 'FAILED') {
          metric.failed++;
        }
      }
    }

    return Array.from(metricsByDate.values());
  }

  async getRecentCampaigns(workspaceId: string, limit: number = 10) {
    const campaigns = await this.prisma.singleSend.findMany({
      where: { workspaceId },
      include: {
        template: { select: { name: true } },
        segment: { select: { name: true } },
        campaignGroup: { select: { name: true } },
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            stats: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      templateName: campaign.template.name,
      segmentName: campaign.segment.name,
      campaignGroupName: campaign.campaignGroup?.name,
      priority: campaign.priority,
      lastRun: campaign.runs[0] ?? null,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    }));
  }

  async getCampaignStats(workspaceId: string, campaignId: string) {
    const campaign = await this.prisma.singleSend.findFirst({
      where: { id: campaignId, workspaceId },
      include: {
        runs: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { recipients: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      return null;
    }

    // Get recipient status breakdown for all runs
    const recipientStats = await this.prisma.singleSendRecipient.groupBy({
      by: ['status', 'skipReason'],
      where: {
        run: { singleSendId: campaignId },
      },
      _count: true,
    });

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      runs: campaign.runs.map((run) => ({
        id: run.id,
        status: run.status,
        stats: run.stats,
        recipientCount: run._count.recipients,
        createdAt: run.createdAt,
      })),
      recipientBreakdown: recipientStats.map((stat) => ({
        status: stat.status,
        skipReason: stat.skipReason,
        count: stat._count,
      })),
    };
  }

  async getSkipReasonBreakdown(workspaceId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const skipReasons = await this.prisma.singleSendRecipient.groupBy({
      by: ['skipReason'],
      where: {
        status: 'SKIPPED',
        createdAt: { gte: startDate },
        run: {
          singleSend: { workspaceId },
        },
      },
      _count: true,
    });

    return skipReasons
      .filter((r) => r.skipReason)
      .map((r) => ({
        reason: r.skipReason,
        count: r._count,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
