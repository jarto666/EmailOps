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

    // Total sent = all emails that left the system (SENT + DELIVERED + BOUNCED + COMPLAINT)
    const totalSent = (statsMap.get('SENT') ?? 0) +
                      (statsMap.get('DELIVERED') ?? 0) +
                      (statsMap.get('BOUNCED') ?? 0) +
                      (statsMap.get('COMPLAINT') ?? 0);
    const totalDelivered = statsMap.get('DELIVERED') ?? 0;
    // Bounced includes both bounces and complaints
    const totalBounced = (statsMap.get('BOUNCED') ?? 0) + (statsMap.get('COMPLAINT') ?? 0);
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

  // Helper to format date as YYYY-MM-DD in local timezone (avoiding UTC conversion issues)
  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getDailyMetrics(workspaceId: string, days: number = 30): Promise<DailyMetric[]> {
    const now = new Date();
    const startDate = new Date(now);
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
        date: this.formatDateLocal(stat.date),
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

    // Group by date - use local date formatting
    const metricsByDate = new Map<string, DailyMetric>();

    // Initialize all dates (from startDate to today inclusive)
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = this.formatDateLocal(date);
      metricsByDate.set(dateStr, {
        date: dateStr,
        sent: 0,
        delivered: 0,
        bounced: 0,
        failed: 0,
      });
    }

    // Aggregate sends - convert createdAt to local date
    for (const send of sends) {
      const sendDate = new Date(send.createdAt);
      const dateStr = this.formatDateLocal(sendDate);
      const metric = metricsByDate.get(dateStr);
      if (metric) {
        // Count SENT, DELIVERED, and COMPLAINT as "sent" (emails that left the system)
        if (send.status === 'SENT' || send.status === 'DELIVERED' || send.status === 'BOUNCED' || send.status === 'COMPLAINT') {
          metric.sent++;
        }
        if (send.status === 'DELIVERED') {
          metric.delivered++;
        }
        // Count both BOUNCED and COMPLAINT as bounced
        if (send.status === 'BOUNCED' || send.status === 'COMPLAINT') {
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
            completedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // Get per-campaign stats from Send table
    const campaignIds = campaigns.map(c => c.id);
    const campaignDeliveryStats = new Map<string, { sent: number; delivered: number }>();
    for (const campaignId of campaignIds) {
      const stats = await this.prisma.send.groupBy({
        by: ['status'],
        where: {
          singleSendRecipient: {
            run: {
              singleSendId: campaignId,
            },
          },
        },
        _count: true,
      });

      let sent = 0;
      let delivered = 0;
      for (const stat of stats) {
        // Count all emails that left the system
        if (['SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINT'].includes(stat.status)) {
          sent += stat._count;
        }
        if (stat.status === 'DELIVERED') {
          delivered += stat._count;
        }
      }
      campaignDeliveryStats.set(campaignId, { sent, delivered });
    }

    return campaigns.map((campaign) => {
      const lastRun = campaign.runs[0] ?? null;
      const deliveryStats = campaignDeliveryStats.get(campaign.id) ?? { sent: 0, delivered: 0 };

      const totalSent = deliveryStats.sent;
      const totalDelivered = deliveryStats.delivered;
      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        templateName: campaign.template?.name,
        segmentName: campaign.segment?.name,
        campaignGroupName: campaign.campaignGroup?.name,
        priority: campaign.priority,
        // Flat properties expected by frontend
        lastRunAt: lastRun?.completedAt ?? lastRun?.createdAt ?? null,
        totalSent,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      };
    });
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
