/**
 * Analytics resource
 */
import type { HttpClient } from '../http';
import type { OverviewStats, DailyMetric } from '../types';

export interface RecentCampaign {
  id: string;
  name: string;
  totalSent: number;
  deliveryRate: number;
  lastRunAt: string | null;
}

export class AnalyticsResource {
  constructor(private http: HttpClient) {}

  /**
   * Get overview statistics
   */
  async getOverview(): Promise<OverviewStats> {
    return this.http.get<OverviewStats>('/analytics/overview');
  }

  /**
   * Get daily metrics for the last N days
   */
  async getDailyMetrics(days?: number): Promise<DailyMetric[]> {
    return this.http.get<DailyMetric[]>('/analytics/daily', days ? { days } : undefined);
  }

  /**
   * Get recent campaign performance
   */
  async getRecentCampaigns(limit?: number): Promise<RecentCampaign[]> {
    return this.http.get<RecentCampaign[]>('/analytics/recent-campaigns', limit ? { limit } : undefined);
  }

  /**
   * Get metrics for a specific campaign
   */
  async getCampaignMetrics(campaignId: string): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
    deliveryRate: number;
  }> {
    return this.http.get(`/analytics/campaigns/${campaignId}`);
  }
}
