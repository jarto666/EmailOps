"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { OverviewStats, DailyMetric, RecentCampaign } from "@/lib/api";
import { HowToButton, howToContent } from "@/components/how-to-modal";

type DateRange = "7d" | "14d" | "30d" | "90d";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color?: "default" | "success" | "warning" | "danger";
}) {
  const colorClasses = {
    default: "bg-tertiary text-muted-foreground",
    success: "bg-emerald-500/20 text-emerald-400",
    warning: "bg-amber-500/20 text-amber-400",
    danger: "bg-rose-500/20 text-rose-400",
  };

  return (
    <div className="card-glow p-6">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-muted-foreground">{title}</div>
      {subtitle && <div className="text-xs text-faint mt-1">{subtitle}</div>}
      {trendLabel && (
        <div className="text-xs text-faint mt-1">{trendLabel}</div>
      )}
    </div>
  );
}

function MiniBarChart({
  data,
  dataKey,
  color = "#6366f1",
  height = 120,
}: {
  data: DailyMetric[];
  dataKey: "sent" | "delivered" | "bounced" | "failed";
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d[dataKey]), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" className="overflow-visible">
        {data.map((d, i) => {
          const barHeight = (d[dataKey] / maxValue) * (height - 20);
          return (
            <g key={i}>
              <rect
                x={`${i * barWidth + barWidth * 0.1}%`}
                y={height - barHeight - 20}
                width={`${barWidth * 0.8}%`}
                height={barHeight}
                fill={color}
                opacity={0.8}
                rx={2}
                className="transition-all duration-200 hover:opacity-100"
              />
              {i % Math.ceil(data.length / 7) === 0 && (
                <text
                  x={`${i * barWidth + barWidth / 2}%`}
                  y={height - 4}
                  textAnchor="middle"
                  className="text-[10px] fill-faint"
                >
                  {new Date(d.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DeliveryFunnel({ stats }: { stats: OverviewStats }) {
  const total = stats.totalSent || 1;
  const stages = [
    { label: "Sent", value: stats.totalSent, color: "bg-blue-500" },
    {
      label: "Delivered",
      value: stats.totalDelivered,
      color: "bg-emerald-500",
    },
    { label: "Bounced", value: stats.totalBounced, color: "bg-amber-500" },
    { label: "Failed", value: stats.totalFailed, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-4">
      {stages.map((stage) => (
        <div key={stage.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">{stage.label}</span>
            <span className="text-sm font-medium text-foreground">
              {stage.value.toLocaleString()} (
              {((stage.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full ${stage.color} rounded-full transition-all duration-500`}
              style={{ width: `${(stage.value / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CampaignPerformanceTable({
  campaigns,
}: {
  campaigns: RecentCampaign[];
}) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-faint">
        No campaign data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Status</th>
            <th className="text-right">Sent</th>
            <th className="text-right">Delivery Rate</th>
            <th>Last Run</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td>
                <span className="font-medium text-foreground">
                  {campaign.name}
                </span>
              </td>
              <td>
                <span
                  className={`badge ${
                    campaign.status === "COMPLETED"
                      ? "badge-success"
                      : campaign.status === "ACTIVE"
                        ? "badge-primary"
                        : campaign.status === "FAILED"
                          ? "badge-danger"
                          : "badge-default"
                  }`}
                >
                  {campaign.status}
                </span>
              </td>
              <td className="text-right font-mono">
                {campaign.totalSent?.toLocaleString()}
              </td>
              <td className="text-right">
                <span
                  className={
                    campaign.deliveryRate >= 95
                      ? "text-emerald-400"
                      : campaign.deliveryRate >= 90
                        ? "text-amber-400"
                        : "text-rose-400"
                  }
                >
                  {campaign.deliveryRate?.toFixed(1)}%
                </span>
              </td>
              <td className="text-faint">
                {campaign.lastRunAt
                  ? new Date(campaign.lastRunAt).toLocaleDateString()
                  : "Never"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [skipReasons, setSkipReasons] = useState<
    Array<{ reason: string; count: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const days = parseInt(dateRange);

    try {
      const [overviewData, metricsData, campaignsData, skipData] =
        await Promise.all([
          api.analytics.getOverview(),
          api.analytics.getDailyMetrics(days),
          api.analytics.getRecentCampaigns(10),
          api.analytics.getSkipReasons(days) as Promise<
            Array<{ reason: string; count: number }>
          >,
        ]);

      setStats(overviewData);
      setDailyMetrics(metricsData);
      setRecentCampaigns(campaignsData);
      setSkipReasons(skipData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div
            className="skeleton"
            style={{ height: "32px", width: "192px", marginBottom: "8px" }}
          />
          <div
            className="skeleton"
            style={{ height: "16px", width: "288px" }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "140px", borderRadius: "16px" }}
            />
          ))}
        </div>
        <div
          className="skeleton"
          style={{ height: "400px", borderRadius: "16px" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={fetchData} className="btn btn-primary">
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Email delivery performance and campaign metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HowToButton {...howToContent.analytics} />
          <select
            className="select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Sent"
          value={stats?.totalSent ?? 0}
          icon={Mail}
          color="default"
        />
        <StatCard
          title="Delivered"
          value={stats?.totalDelivered ?? 0}
          subtitle={`${stats?.deliveryRate?.toFixed(1) ?? 0}% delivery rate`}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Bounced"
          value={stats?.totalBounced ?? 0}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Failed"
          value={stats?.totalFailed ?? 0}
          icon={XCircle}
          color="danger"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Send Volume Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Send Volume
              </h3>
              <p className="text-sm text-faint">Emails sent over time</p>
            </div>
            <BarChart3 className="w-5 h-5 text-faint" />
          </div>
          <MiniBarChart
            data={dailyMetrics}
            dataKey="sent"
            color="#6366f1"
            height={200}
          />
        </div>

        {/* Delivery Funnel */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Delivery Funnel
              </h3>
              <p className="text-sm text-faint">Email delivery breakdown</p>
            </div>
            <TrendingUp className="w-5 h-5 text-faint" />
          </div>
          {stats && <DeliveryFunnel stats={stats} />}
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Delivery Trend */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Delivered
              </h3>
              <p className="text-sm text-faint">
                Successfully delivered emails
              </p>
            </div>
          </div>
          <MiniBarChart
            data={dailyMetrics}
            dataKey="delivered"
            color="#10b981"
            height={150}
          />
        </div>

        {/* Bounce Trend */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Bounced</h3>
              <p className="text-sm text-faint">Bounced emails over time</p>
            </div>
          </div>
          <MiniBarChart
            data={dailyMetrics}
            dataKey="bounced"
            color="#f59e0b"
            height={150}
          />
        </div>

        {/* Failed Trend */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Failed</h3>
              <p className="text-sm text-faint">Failed sends over time</p>
            </div>
          </div>
          <MiniBarChart
            data={dailyMetrics}
            dataKey="failed"
            color="#ef4444"
            height={150}
          />
        </div>
      </div>

      {/* Skip Reasons & Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skip Reasons */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Skip Reasons
          </h3>
          <p className="text-sm text-faint mb-6">Why emails were not sent</p>
          {skipReasons.length > 0 ? (
            <div className="space-y-3">
              {skipReasons.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground truncate max-w-[180px]">
                    {item.reason || "Unknown"}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-faint">No skipped emails</div>
          )}
        </div>

        {/* Campaign Performance */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Campaign Performance
          </h3>
          <p className="text-sm text-faint mb-6">
            Recent campaign delivery statistics
          </p>
          <CampaignPerformanceTable campaigns={recentCampaigns} />
        </div>
      </div>
    </div>
  );
}
