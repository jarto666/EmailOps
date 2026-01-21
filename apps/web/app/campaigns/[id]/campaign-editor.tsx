"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Play,
  Clock,
  FileText,
  Users,
  Mail,
  Calendar,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  Campaign,
  Template,
  Segment,
  SenderProfile,
  CampaignRun,
} from "@/lib/api";
import { useToast } from "@/components/toast";

type CampaignStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "ARCHIVED"
  | "COMPLETED"
  | "FAILED";
type ScheduleType = "MANUAL" | "CRON";

function StatusBadge({ status }: { status: CampaignStatus }) {
  const styles: Record<CampaignStatus, string> = {
    DRAFT: "badge-default",
    ACTIVE: "badge-success",
    PAUSED: "badge-warning",
    ARCHIVED: "badge-default",
    COMPLETED: "badge-primary",
    FAILED: "badge-error",
  };

  return <span className={`badge ${styles[status]}`}>{status}</span>;
}

function RunStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "badge-default",
    RUNNING: "badge-warning",
    COMPLETED: "badge-success",
    FAILED: "badge-error",
  };

  return (
    <span className={`badge ${styles[status] || "badge-default"}`}>
      {status}
    </span>
  );
}

export default function CampaignEditor({
  campaignId,
}: {
  campaignId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("DRAFT");
  const [templateId, setTemplateId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [senderProfileId, setSenderProfileId] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("MANUAL");
  const [cronExpression, setCronExpression] = useState("0 9 * * *");
  const [priority, setPriority] = useState(10);

  const fetchData = useCallback(async () => {
    try {
      const [camp, tmpl, segs, profiles] = await Promise.all([
        api.campaigns.get(campaignId),
        api.templates.list(),
        api.segments.list(),
        api.senderProfiles.list(),
      ]);
      setCampaign(camp);
      setTemplates(tmpl);
      setSegments(segs);
      setSenderProfiles(profiles);

      // Populate form
      setName(camp.name);
      setDescription(camp.description || "");
      setStatus(camp.status);
      setTemplateId(camp.templateId);
      setSegmentId(camp.segmentId);
      setSenderProfileId(camp.senderProfileId);
      setScheduleType(camp.scheduleType);
      setCronExpression(camp.cronExpression || "0 9 * * *");
      setPriority(camp.priority || 10);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch campaign",
      );
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updated = await api.campaigns.update(campaignId, {
        name,
        description: description || undefined,
        status: status as any,
        templateId,
        segmentId,
        senderProfileId,
        scheduleType,
        cronExpression: scheduleType === "CRON" ? cronExpression : undefined,
        priority,
      });
      setCampaign(updated);
      toast.success("Campaign saved successfully");
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save campaign",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrigger = async () => {
    setIsTriggering(true);

    try {
      await api.campaigns.trigger(campaignId);
      toast.success("Campaign triggered successfully");
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to trigger campaign",
      );
    } finally {
      setIsTriggering(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this campaign? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.campaigns.delete(campaignId);
      toast.success("Campaign deleted");
      router.push("/campaigns");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete campaign",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div
            className="skeleton"
            style={{ height: "40px", width: "40px", borderRadius: "8px" }}
          />
          <div>
            <div
              className="skeleton"
              style={{ height: "28px", width: "200px", marginBottom: "8px" }}
            />
            <div
              className="skeleton"
              style={{ height: "16px", width: "300px" }}
            />
          </div>
        </div>
        <div
          className="skeleton"
          style={{ height: "500px", borderRadius: "16px" }}
        />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="card">
        <div className="empty-state">
          <AlertCircle className="empty-state-icon text-rose-400" />
          <h3 className="empty-state-title">Campaign not found</h3>
          <p className="empty-state-description">
            The campaign you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Link href="/campaigns" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/campaigns" className="btn btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {campaign.name}
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              {campaign.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="btn btn-secondary"
            disabled={isSaving || isTriggering}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleTrigger}
            className="btn btn-primary"
            disabled={isSaving || isTriggering}
          >
            {isTriggering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Trigger
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-secondary text-rose-400 hover:bg-rose-500/10"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="card-glow">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Campaign Settings
            </h2>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Campaign name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="select"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as CampaignStatus)
                    }
                    disabled={isSaving}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="ARCHIVED">Archived</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Template
                  </label>
                  <select
                    className="select"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    disabled={isSaving}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Segment
                  </label>
                  <select
                    className="select"
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                    disabled={isSaving}
                  >
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Sender Profile
                  </label>
                  <select
                    className="select"
                    value={senderProfileId}
                    onChange={(e) => setSenderProfileId(e.target.value)}
                    disabled={isSaving}
                  >
                    {senderProfiles.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.fromName
                          ? `${sp.fromName} <${sp.fromEmail}>`
                          : sp.fromEmail}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule Type
                  </label>
                  <select
                    className="select"
                    value={scheduleType}
                    onChange={(e) =>
                      setScheduleType(e.target.value as ScheduleType)
                    }
                    disabled={isSaving}
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="CRON">Scheduled (CRON)</option>
                  </select>
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Cron Expression
                  </label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    placeholder="0 9 * * *"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    disabled={isSaving || scheduleType !== "CRON"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g., &quot;0 9 * * MON&quot; for every Monday at 9 AM
                  </p>
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Priority
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={100}
                    value={priority}
                    onChange={(e) =>
                      setPriority(parseInt(e.target.value || "10", 10))
                    }
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lower number = higher priority
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border-default">
              <Link href="/campaigns" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Recent Runs */}
          <div className="card-glow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Runs
              </h3>
              <span className="badge badge-default">
                {campaign.runs?.length || 0}
              </span>
            </div>

            {campaign.runs && campaign.runs.length > 0 ? (
              <div className="space-y-3">
                {campaign.runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border-default"
                  >
                    <div className="flex items-center gap-3">
                      <RunStatusBadge status={run.status} />
                      <div>
                        <p className="text-sm font-mono text-muted-foreground">
                          {run.id.slice(0, 12)}...
                        </p>
                        {run.stats && (
                          <p className="text-xs text-muted-foreground">
                            Sent: {run.stats.sent} | Failed: {run.stats.failed}{" "}
                            | Skipped: {run.stats.skipped}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No runs yet. Click{" "}
                <span className="text-foreground font-medium">Trigger</span> to
                start.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="card-glow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Campaign Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">ID</span>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {campaign.id}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Template</span>
                <p className="text-sm text-foreground">
                  {campaign.template?.name || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Segment</span>
                <p className="text-sm text-foreground">
                  {campaign.segment?.name || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Sender</span>
                <p className="text-sm text-foreground">
                  {campaign.senderProfile?.fromEmail || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Schedule Card */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Schedule</h4>
                <p className="text-xs text-muted-foreground">
                  {campaign.scheduleType === "CRON" ? (
                    <>
                      Scheduled:{" "}
                      <code className="text-indigo-400">
                        {campaign.cronExpression}
                      </code>
                    </>
                  ) : (
                    "Manual trigger only"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Priority</h4>
                <p className="text-xs text-muted-foreground">
                  Lower priority number means higher importance. Used for
                  collision detection when multiple campaigns target the same
                  user.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
