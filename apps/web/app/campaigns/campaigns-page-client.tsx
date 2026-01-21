"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Calendar,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  api,
  type Campaign,
  type CampaignGroup,
  type Template,
  type Segment,
  type SenderProfile,
} from "@/lib/api";
import { HowToButton, howToContent } from "@/components/how-to-modal";
import { useToast } from "@/components/toast";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; label: string }> = {
    COMPLETED: { class: "badge-success", label: "Completed" },
    ACTIVE: { class: "badge-primary", label: "Active" },
    DRAFT: { class: "badge-default", label: "Draft" },
    PAUSED: { class: "badge-warning", label: "Paused" },
    FAILED: { class: "badge-danger", label: "Failed" },
    ARCHIVED: { class: "badge-default", label: "Archived" },
  };

  const style = styles[status] || { class: "badge-default", label: status };
  return <span className={`badge ${style.class}`}>{style.label}</span>;
}

function ScheduleBadge({ type, cron }: { type: string; cron?: string | null }) {
  if (type === "CRON" && cron) {
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
  onCreated,
  templates,
  segments,
  senderProfiles,
  campaignGroups,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  templates: Template[];
  segments: Segment[];
  senderProfiles: SenderProfile[];
  campaignGroups: CampaignGroup[];
}) {
  const toast = useToast();
  const [scheduleType, setScheduleType] = useState<"MANUAL" | "CRON">("MANUAL");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    templateId: "",
    segmentId: "",
    senderProfileId: "",
    campaignGroupId: "",
    priority: 50,
    cronExpression: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.campaigns.create({
        name: formData.name,
        description: formData.description || undefined,
        templateId: formData.templateId,
        segmentId: formData.segmentId,
        senderProfileId: formData.senderProfileId,
        campaignGroupId: formData.campaignGroupId || undefined,
        priority: formData.priority,
        scheduleType,
        cronExpression:
          scheduleType === "CRON" ? formData.cronExpression : undefined,
      });
      toast.success("Campaign created successfully");
      onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create campaign",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-secondary border border-border-default rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Create Campaign
          </h2>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Campaign Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Weekly Newsletter"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              placeholder="Brief description of this campaign"
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="form-grid">
            <div>
              <label className="label">Template</label>
              <select
                className="select"
                value={formData.templateId}
                onChange={(e) =>
                  setFormData({ ...formData, templateId: e.target.value })
                }
                required
              >
                <option value="">Select a template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Segment</label>
              <select
                className="select"
                value={formData.segmentId}
                onChange={(e) =>
                  setFormData({ ...formData, segmentId: e.target.value })
                }
                required
              >
                <option value="">Select a segment</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="label">Sender Profile</label>
              <select
                className="select"
                value={formData.senderProfileId}
                onChange={(e) =>
                  setFormData({ ...formData, senderProfileId: e.target.value })
                }
                required
              >
                <option value="">Select a sender</option>
                {senderProfiles.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name || sp.fromEmail}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Campaign Group</label>
              <select
                className="select"
                value={formData.campaignGroupId}
                onChange={(e) =>
                  setFormData({ ...formData, campaignGroupId: e.target.value })
                }
              >
                <option value="">No group (no collision check)</option>
                {campaignGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
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
                onChange={(e) =>
                  setScheduleType(e.target.value as "MANUAL" | "CRON")
                }
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
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value) || 50,
                  })
                }
              />
              <p className="text-xs text-faint mt-1">
                Lower number = higher priority
              </p>
            </div>
          </div>

          {scheduleType === "CRON" && (
            <div>
              <label className="label">CRON Expression</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="0 9 * * MON"
                value={formData.cronExpression}
                onChange={(e) =>
                  setFormData({ ...formData, cronExpression: e.target.value })
                }
              />
              <p className="text-xs text-faint mt-1">
                e.g., "0 9 * * MON" for every Monday at 9 AM
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : null}
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignsPageClient() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>([]);
  const [campaignGroups, setCampaignGroups] = useState<CampaignGroup[]>([]);

  const fetchData = async () => {
    try {
      const [
        campaignsData,
        templatesData,
        segmentsData,
        profilesData,
        groupsData,
      ] = await Promise.all([
        api.campaigns.list(),
        api.templates.list(),
        api.segments.list(),
        api.senderProfiles.list(),
        api.campaignGroups.list(),
      ]);

      setCampaigns(campaignsData);
      setTemplates(templatesData);
      setSegments(segmentsData);
      setSenderProfiles(profilesData);
      setCampaignGroups(groupsData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await api.campaigns.delete(id);
      toast.success("Campaign deleted");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

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
        <div className="list-container">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "160px", borderRadius: "16px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-description">
            Manage single-send campaigns with scheduling and collision detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HowToButton {...howToContent.campaigns} />
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="search-icon"
            style={{ width: "20px", height: "20px" }}
          />
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
          style={{ width: "auto" }}
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
        <div className="flex flex-col gap-4">
          {filteredCampaigns.map((campaign) => {
            const lastRun = campaign.runs?.[0];
            const totalSent =
              campaign.runs?.reduce(
                (acc, r) => acc + (r.stats?.sent || 0),
                0,
              ) || 0;

            return (
              <div key={campaign.id} className="card-glow group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400">
                      <Send className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="text-lg font-semibold text-foreground hover:text-indigo-400 transition-colors"
                        >
                          {campaign.name}
                        </Link>
                        <StatusBadge status={campaign.status} />
                        <ScheduleBadge
                          type={campaign.scheduleType}
                          cron={campaign.cronExpression}
                        />
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {campaign.description}
                        </p>
                      )}

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-faint">
                          <Users className="w-4 h-4" />
                          <span>{campaign.segment?.name || "No segment"}</span>
                        </div>
                        {campaign.campaignGroup && (
                          <div className="flex items-center gap-2 text-faint">
                            <FolderKanban className="w-4 h-4" />
                            <span>{campaign.campaignGroup.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-faint">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            Priority: {campaign.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {campaign.status === "DRAFT" && (
                      <button className="btn btn-primary text-sm py-1.5 px-3">
                        <Play className="w-4 h-4" />
                        Run Now
                      </button>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn btn-ghost p-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        className="btn btn-ghost p-2 text-rose-400"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {campaign.runs && campaign.runs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border-default">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-foreground">
                            {campaign.runs.length}
                          </div>
                          <div className="text-xs text-faint">Runs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-foreground">
                            {(totalSent / 1000).toFixed(1)}K
                          </div>
                          <div className="text-xs text-faint">Total Sent</div>
                        </div>
                        {lastRun && lastRun.stats && (
                          <>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-emerald-400">
                                {(
                                  (lastRun.stats.sent / lastRun.stats.total) *
                                  100
                                ).toFixed(1)}
                                %
                              </div>
                              <div className="text-xs text-faint">
                                Last Success Rate
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-faint">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                {new Date(
                                  lastRun.createdAt,
                                ).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-faint">Last Run</div>
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
              {searchQuery || statusFilter !== "all"
                ? "No campaigns match your filters"
                : "Create your first campaign to start sending emails"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Create Campaign
              </button>
            )}
          </div>
        </div>
      )}

      <CreateCampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchData}
        templates={templates}
        segments={segments}
        senderProfiles={senderProfiles}
        campaignGroups={campaignGroups}
      />
    </div>
  );
}
