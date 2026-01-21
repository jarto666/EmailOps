'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  CheckCircle2,
  XCircle,
  Zap,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Users,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { api, type OverviewStats, type DailyMetric, type RecentCampaign } from '@/lib/api';
import { HowToButton, howToContent } from '@/components/how-to-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    COMPLETED: 'secondary',
    ACTIVE: 'default',
    DRAFT: 'outline',
    PAUSED: 'outline',
    FAILED: 'destructive',
  };

  return (
    <Badge variant={variants[status] || 'outline'}>
      {status}
    </Badge>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'indigo',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
  const colors = {
    indigo: 'from-indigo-500/20 to-purple-500/20 text-indigo-400',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400',
    rose: 'from-rose-500/20 to-pink-500/20 text-rose-400',
  };

  return (
    <Card className="group relative overflow-hidden">
      <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] pointer-events-none" />
      <CardContent className="pt-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center transition-transform group-hover:scale-110`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="text-3xl font-bold mb-1">
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        <div className="text-sm text-muted-foreground">{title}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniChart({ data }: { data: DailyMetric[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
        No data yet
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.sent), 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((day) => {
        const height = (day.sent / maxValue) * 100;
        return (
          <div
            key={day.date}
            className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ height: `${Math.max(height, 2)}%` }}
            title={`${day.date}: ${day.sent.toLocaleString()} sent`}
          />
        );
      })}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="group cursor-pointer hover:border-primary/30 transition-all hover:-translate-y-0.5">
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 font-medium group-hover:text-primary transition-colors">
                {title}
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyMetric[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewData, dailyMetrics, campaigns] = await Promise.all([
          api.analytics.getOverview(),
          api.analytics.getDailyMetrics(7),
          api.analytics.getRecentCampaigns(5),
        ]);

        setStats(overviewData);
        setDailyData(dailyMetrics);
        setRecentCampaigns(campaigns);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your email performance and manage campaigns
          </p>
        </div>
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-16 h-16 text-amber-400 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Unable to load data</h3>
              <p className="text-muted-foreground max-w-xs mb-2">{error}</p>
              <p className="text-sm text-muted-foreground">
                Make sure the API server is running on port 3300
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayStats = stats || {
    totalSent: 0,
    deliveryRate: 0,
    totalBounced: 0,
    activeCampaigns: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalSegments: 0,
    totalTemplates: 0,
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your email performance and manage campaigns
          </p>
        </div>
        <HowToButton {...howToContent.dashboard} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Emails Sent"
          value={displayStats.totalSent}
          subtitle="Last 30 days"
          icon={Send}
          color="indigo"
        />
        <StatCard
          title="Delivery Rate"
          value={displayStats.totalSent > 0 ? `${displayStats.deliveryRate.toFixed(1)}%` : '-'}
          subtitle="Industry avg: 96%"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Total Bounced"
          value={displayStats.totalBounced}
          subtitle="Hard + Soft bounces"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Active Campaigns"
          value={displayStats.activeCampaigns}
          subtitle="Currently running"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Send Volume</CardTitle>
            <p className="text-sm text-muted-foreground">Daily emails sent this week</p>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <MiniChart data={dailyData} />
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <span className="text-sm text-muted-foreground">Emails Sent</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Total: {dailyData.reduce((acc, d) => acc + d.sent, 0).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <QuickAction
            href="/campaigns"
            icon={Plus}
            title="New Campaign"
            description="Create a new single send campaign"
          />
          <QuickAction
            href="/segments"
            icon={Users}
            title="Create Segment"
            description="Define a new audience with SQL"
          />
          <QuickAction
            href="/templates"
            icon={FileText}
            title="Edit Templates"
            description="Update your email designs"
          />
        </div>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Campaigns</CardTitle>
              <p className="text-sm text-muted-foreground">Your latest single sends</p>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/campaigns">
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentCampaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Sent</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Rate</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Run</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="py-4 px-4">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {campaign.name}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {(campaign.totalSent ?? 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={(campaign.deliveryRate ?? 0) >= 98 ? 'text-emerald-400' : 'text-muted-foreground'}>
                          {(campaign.deliveryRate ?? 0) > 0 ? `${(campaign.deliveryRate ?? 0).toFixed(1)}%` : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {campaign.lastRunAt ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {new Date(campaign.lastRunAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span>Never</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Send className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground max-w-xs mb-4">
                Create your first campaign to start sending emails
              </p>
              <Button asChild>
                <Link href="/campaigns">
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
