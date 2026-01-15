'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Plus,
  Search,
  Play,
  Pause,
  Clock,
  ChevronRight,
  FolderKanban,
  RefreshCw,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
} from 'lucide-react';

// Mock data
const mockCampaignGroups = [
  { id: '1', name: 'Activation Emails' },
  { id: '2', name: 'Billing Alerts' },
  { id: '3', name: 'Marketing' },
];

const mockTemplates = [
  { id: '1', name: 'Welcome Email', key: 'welcome-email' },
  { id: '2', name: 'Weekly Digest', key: 'weekly-digest' },
  { id: '3', name: 'Low Credits Alert', key: 'low-credits-alert' },
];

const mockSegments = [
  { id: '1', name: 'Active Users (30d)' },
  { id: '2', name: 'Low Credit Users' },
  { id: '3', name: 'Premium Subscribers' },
];

const mockSenderProfiles = [
  { id: '1', fromEmail: 'news@company.com', fromName: 'Company News' },
  { id: '2', fromEmail: 'alerts@company.com', fromName: 'Company Alerts' },
];

const mockCampaigns = [
  {
    id: '1',
    name: 'Weekly Newsletter',
    description: 'Our weekly product updates and tips',
    status: 'ACTIVE',
    scheduleType: 'CRON',
    cronExpression: '0 9 * * MON',
    priority: 50,
    template: { id: '2', name: 'Weekly Digest', key: 'weekly-digest' },
    segment: { id: '1', name: 'Active Users (30d)' },
    senderProfile: { id: '1', fromEmail: 'news@company.com', fromName: 'Company News' },
    campaignGroup: { id: '3', name: 'Marketing' },
    runs: [
      { id: 'r1', status: 'COMPLETED', stats: { total: 15420, sent: 15200, failed: 12, skipped: 208 }, createdAt: '2024-01-14T09:00:00Z' },
      { id: 'r2', status: 'COMPLETED', stats: { total: 14890, sent: 14700, failed: 8, skipped: 182 }, createdAt: '2024-01-07T09:00:00Z' },
    ],
  },
  {
    id: '2',
    name: 'Low Credits Alert',
    description: 'Alert users when their credits are running low',
    status: 'ACTIVE',
    scheduleType: 'CRON',
    cronExpression: '0 10 * * *',
    priority: 90,
    template: { id: '3', name: 'Low Credits Alert', key: 'low-credits-alert' },
    segment: { id: '2', name: 'Low Credit Users' },
    senderProfile: { id: '2', fromEmail: 'alerts@company.com', fromName: 'Company Alerts' },
    campaignGroup: { id: '2', name: 'Billing Alerts' },
    runs: [
      { id: 'r3', status: 'COMPLETED', stats: { total: 3200, sent: 3150, failed: 5, skipped: 45 }, createdAt: '2024-01-14T10:00:00Z' },
    ],
  },
  {
    id: '3',
    name: 'Welcome Series - Day 1',
    description: 'First email in the welcome series',
    status: 'DRAFT',
    scheduleType: 'MANUAL',
    priority: 100,
    template: { id: '1', name: 'Welcome Email', key: 'welcome-email' },
    segment: { id: '1', name: 'Active Users (30d)' },
    senderProfile: { id: '1', fromEmail: 'news@company.com', fromName: 'Company News' },
    campaignGroup: { id: '1', name: 'Activation Emails' },
    runs: [],
  },
  {
    id: '4',
    name: 'Premium Feature Announcement',
    description: 'Announce new premium features',
    status: 'COMPLETED',
    scheduleType: 'MANUAL',
    priority: 60,
    template: { id: '2', name: 'Weekly Digest', key: 'weekly-digest' },
    segment: { id: '3', name: 'Premium Subscribers' },
    senderProfile: { id: '1', fromEmail: 'news@company.com', fromName: 'Company News' },
    campaignGroup: { id: '3', name: 'Marketing' },
    runs: [
      { id: 'r4', status: 'COMPLETED', stats: { total: 12890, sent: 12800, failed: 10, skipped: 80 }, createdAt: '2024-01-10T14:00:00Z' },
    ],
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; label: string }> = {
    COMPLETED: { class: 'badge-success', label: 'Completed' },
    ACTIVE: { class: 'badge-primary', label: 'Active' },
    DRAFT: { class: 'badge-default', label: 'Draft' },
    PAUSED: { class: 'badge-warning', label: 'Paused' },
    FAILED: { class: 'badge-danger', label: 'Failed' },
    ARCHIVED: { class: 'badge-default', label: 'Archived' },
  };

  const style = styles[status] || { class: 'badge-default', label: status };
  return <span className={`badge ${style.class}`}>{style.label}</span>;
}

function ScheduleBadge({ type, cron }: { type: string; cron?: string | null }) {
  if (type === 'CRON' && cron) {
    return (
      <span className="badge badge-default">
        <Clock className="w-3 h-3 mr-1" />
        Scheduled
      </span>
    );
  }
  return (
    <span className="badge badge-default">
      <Play className="w-3 h-3 mr-1" />
      Manual
    </span>
  );
}

function CreateCampaignModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [scheduleType, setScheduleType] = useState<'MANUAL' | 'CRON'>('MANUAL');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create Campaign</h2>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-5">
          <div>
            <label className="label">Campaign Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Weekly Newsletter"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              placeholder="Brief description of this campaign"
              rows={2}
            />
          </div>

          <div className="form-grid">
            <div>
              <label className="label">Template</label>
              <select className="select">
                <option value="">Select a template</option>
                {mockTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Segment</label>
              <select className="select">
                <option value="">Select a segment</option>
                {mockSegments.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="label">Sender Profile</label>
              <select className="select">
                <option value="">Select a sender</option>
                {mockSenderProfiles.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.fromName} ({sp.fromEmail})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Campaign Group</label>
              <select className="select">
                <option value="">No group (no collision check)</option>
                {mockCampaignGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="label">Schedule Type</label>
              <select
                className="select"
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as 'MANUAL' | 'CRON')}
              >
                <option value="MANUAL">Manual</option>
                <option value="CRON">Scheduled (CRON)</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <input
                type="number"
                className="input"
                placeholder="50"
                min={1}
                max={100}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Higher priority wins in collision detection
              </p>
            </div>
          </div>

          {scheduleType === 'CRON' && (
            <div>
              <label className="label">CRON Expression</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="0 9 * * MON"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                e.g., "0 9 * * MON" for every Monday at 9 AM
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignsPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredCampaigns = mockCampaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ height: '32px', width: '192px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '288px' }} />
        </div>
        <div className="list-container">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex-between mb-lg">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-description">
            Manage single-send campaigns with scheduling and collision detection
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-container">
          <Search className="search-icon" style={{ width: '20px', height: '20px' }} />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length > 0 ? (
        <div className="list-container">
          {filteredCampaigns.map((campaign) => {
            const lastRun = campaign.runs?.[0];
            const totalSent = campaign.runs?.reduce((acc, r) => acc + (r.stats?.sent || 0), 0) || 0;

            return (
              <div key={campaign.id} className="card-glow group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400">
                      <Send className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="text-lg font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors"
                        >
                          {campaign.name}
                        </Link>
                        <StatusBadge status={campaign.status} />
                        <ScheduleBadge type={campaign.scheduleType} cron={campaign.cronExpression} />
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                          {campaign.description}
                        </p>
                      )}

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                          <Users className="w-4 h-4" />
                          <span>{campaign.segment?.name}</span>
                        </div>
                        {campaign.campaignGroup && (
                          <div className="flex items-center gap-2 text-[var(--text-muted)]">
                            <FolderKanban className="w-4 h-4" />
                            <span>{campaign.campaignGroup.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                          <span className="text-xs bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                            Priority: {campaign.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {campaign.status === 'ACTIVE' && (
                      <button className="btn btn-ghost p-2" title="Pause">
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {campaign.status === 'PAUSED' && (
                      <button className="btn btn-ghost p-2" title="Resume">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {campaign.status === 'DRAFT' && (
                      <button className="btn btn-primary text-sm py-1.5 px-3">
                        <Play className="w-4 h-4" />
                        Run Now
                      </button>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn btn-ghost p-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost p-2 text-rose-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {campaign.runs && campaign.runs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[var(--text-primary)]">
                            {campaign.runs.length}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">Runs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[var(--text-primary)]">
                            {(totalSent / 1000).toFixed(1)}K
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">Total Sent</div>
                        </div>
                        {lastRun && (
                          <>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-emerald-400">
                                {lastRun.stats ? ((lastRun.stats.sent / lastRun.stats.total) * 100).toFixed(1) : 0}%
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">Last Success Rate</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-[var(--text-muted)]">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                {new Date(lastRun.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">Last Run</div>
                            </div>
                          </>
                        )}
                      </div>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Send className="empty-state-icon" />
            <h3 className="empty-state-title">No campaigns found</h3>
            <p className="empty-state-description">
              {searchQuery || statusFilter !== 'all'
                ? 'No campaigns match your filters'
                : 'Create your first campaign to start sending emails'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Create Campaign
              </button>
            )}
          </div>
        </div>
      )}

      <CreateCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
