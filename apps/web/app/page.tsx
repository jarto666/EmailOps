'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Zap,
  Users,
  FileText,
} from 'lucide-react';

// Mock data - replace with real API calls
const mockStats = {
  totalSent: 124532,
  deliveryRate: 98.2,
  totalBounced: 1842,
  activeCampaigns: 12,
};

const mockDailyData = [
  { date: '2024-01-08', sent: 4200, delivered: 4100 },
  { date: '2024-01-09', sent: 3800, delivered: 3720 },
  { date: '2024-01-10', sent: 5100, delivered: 5000 },
  { date: '2024-01-11', sent: 4600, delivered: 4500 },
  { date: '2024-01-12', sent: 3200, delivered: 3150 },
  { date: '2024-01-13', sent: 2800, delivered: 2750 },
  { date: '2024-01-14', sent: 4900, delivered: 4800 },
];

const mockRecentCampaigns = [
  { id: '1', name: 'Weekly Newsletter', status: 'COMPLETED', sent: 15420, delivered: 15200, createdAt: '2024-01-14' },
  { id: '2', name: 'Low Credits Alert', status: 'ACTIVE', sent: 3200, delivered: 3150, createdAt: '2024-01-13' },
  { id: '3', name: 'New Feature Announcement', status: 'DRAFT', sent: 0, delivered: 0, createdAt: '2024-01-12' },
  { id: '4', name: 'Onboarding Day 7', status: 'ACTIVE', sent: 890, delivered: 875, createdAt: '2024-01-11' },
];

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    COMPLETED: 'badge-success',
    ACTIVE: 'badge-primary',
    DRAFT: 'badge-default',
    PAUSED: 'badge-warning',
    FAILED: 'badge-danger',
  };

  return (
    <span className={`badge ${styles[status as keyof typeof styles] || 'badge-default'}`}>
      {status}
    </span>
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
  icon: any;
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
    <div className="stat-card group">
      <div className="relative z-10">
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
        <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        <div className="text-sm text-[var(--text-secondary)]">{title}</div>
        {subtitle && (
          <div className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function MiniChart({ data }: { data: typeof mockDailyData }) {
  const maxValue = Math.max(...data.map(d => d.sent));

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((day, i) => {
        const height = (day.sent / maxValue) * 100;
        return (
          <div
            key={day.date}
            className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ height: `${height}%` }}
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
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="card-glow group cursor-pointer">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-indigo-400 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium group-hover:text-indigo-400 transition-colors">
            {title}
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ height: '32px', width: '192px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '288px' }} />
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Monitor your email performance and manage campaigns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Emails Sent"
          value={mockStats.totalSent}
          subtitle="Last 30 days"
          icon={Send}
          trend={12}
          color="indigo"
        />
        <StatCard
          title="Delivery Rate"
          value={`${mockStats.deliveryRate}%`}
          subtitle="Industry avg: 96%"
          icon={CheckCircle2}
          trend={2}
          color="emerald"
        />
        <StatCard
          title="Total Bounced"
          value={mockStats.totalBounced}
          subtitle="Hard + Soft bounces"
          icon={XCircle}
          trend={-5}
          color="rose"
        />
        <StatCard
          title="Active Campaigns"
          value={mockStats.activeCampaigns}
          subtitle="Currently running"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Chart & Recent Activity */}
      <div className="dashboard-grid">
        {/* Chart Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Send Volume</h2>
              <p className="text-sm text-[var(--text-secondary)]">Daily emails sent this week</p>
            </div>
            <select className="select w-auto text-sm py-1.5 px-3">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-48">
            <MiniChart data={mockDailyData} />
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-default)]">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                <span className="text-sm text-[var(--text-secondary)]">Emails Sent</span>
              </div>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              Total: {mockDailyData.reduce((acc, d) => acc + d.sent, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2 className="quick-actions-title">Quick Actions</h2>
          <QuickAction
            href="/campaigns/new"
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
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Campaigns</h2>
            <p className="text-sm text-[var(--text-secondary)]">Your latest single sends</p>
          </div>
          <Link href="/campaigns" className="btn btn-secondary text-sm">
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Delivered</th>
                <th>Rate</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {mockRecentCampaigns.map((campaign) => {
                const rate = campaign.sent > 0
                  ? ((campaign.delivered / campaign.sent) * 100).toFixed(1)
                  : '-';

                return (
                  <tr key={campaign.id}>
                    <td>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-medium text-[var(--text-primary)] hover:text-indigo-400 transition-colors"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {campaign.sent.toLocaleString()}
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {campaign.delivered.toLocaleString()}
                    </td>
                    <td>
                      <span className={campaign.sent > 0 && parseFloat(rate) >= 98 ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}>
                        {rate}{campaign.sent > 0 ? '%' : ''}
                      </span>
                    </td>
                    <td className="text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {mockRecentCampaigns.length === 0 && (
          <div className="empty-state">
            <Send className="empty-state-icon" />
            <h3 className="empty-state-title">No campaigns yet</h3>
            <p className="empty-state-description">
              Create your first campaign to start sending emails
            </p>
            <Link href="/campaigns/new" className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Create Campaign
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
