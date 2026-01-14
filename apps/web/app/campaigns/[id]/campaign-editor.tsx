"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" | "COMPLETED" | "FAILED";
type ScheduleType = "MANUAL" | "CRON";

type CampaignRun = {
  id: string;
  status: string;
  stats?: any;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  scheduleType: ScheduleType;
  cronExpression?: string | null;
  policies?: any;
  templateId: string;
  segmentId: string;
  senderProfileId: string;
  template?: { id: string; name: string; key: string };
  segment?: { id: string; name: string };
  senderProfile?: { id: string; fromEmail: string; fromName?: string | null };
  runs?: CampaignRun[];
};

type Template = { id: string; name: string; key: string };
type Segment = { id: string; name: string };
type SenderProfile = { id: string; fromEmail: string; fromName?: string | null };

export default function CampaignEditor({
  campaignId,
  workspaceId,
}: {
  campaignId: string;
  workspaceId: string;
}) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // editor state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("DRAFT");
  const [templateId, setTemplateId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [senderProfileId, setSenderProfileId] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("MANUAL");
  const [cronExpression, setCronExpression] = useState("0 * * * *");
  const [rateLimitPerSecond, setRateLimitPerSecond] = useState<number>(10);

  async function loadAll() {
    setError(null);
    try {
      const [c, ts, ss, sps] = await Promise.all([
        apiFetch<Campaign>(`/campaigns/${campaignId}`, { query: { workspaceId } }),
        apiFetch<any[]>("/templates", { query: { workspaceId } }),
        apiFetch<any[]>("/segments", { query: { workspaceId } }),
        apiFetch<any[]>("/sender-profiles", { query: { workspaceId } }),
      ]);
      setCampaign(c);
      setTemplates(ts.map((t) => ({ id: t.id, name: t.name, key: t.key })));
      setSegments(ss.map((s) => ({ id: s.id, name: s.name })));
      setSenderProfiles(
        sps.map((sp) => ({
          id: sp.id,
          fromEmail: sp.fromEmail,
          fromName: sp.fromName ?? null,
        }))
      );

      setName(c.name);
      setDescription(c.description ?? "");
      setStatus(c.status);
      setTemplateId(c.templateId);
      setSegmentId(c.segmentId);
      setSenderProfileId(c.senderProfileId);
      setScheduleType(c.scheduleType);
      setCronExpression(c.cronExpression ?? "0 * * * *");
      setRateLimitPerSecond(
        Number(c.policies?.rateLimitPerSecond ?? 10) || 10
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, workspaceId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/campaigns/${campaignId}`, {
        method: "PATCH",
        query: { workspaceId },
        body: JSON.stringify({
          name,
          description: description || undefined,
          status,
          templateId,
          segmentId,
          senderProfileId,
          scheduleType,
          cronExpression: scheduleType === "CRON" ? cronExpression : undefined,
          policies: { rateLimitPerSecond },
        }),
      });
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function trigger() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/campaigns/${campaignId}/trigger`, {
        method: "POST",
        query: { workspaceId },
        body: JSON.stringify({}),
      });
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this campaign?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/campaigns/${campaignId}`, {
        method: "DELETE",
        query: { workspaceId },
      });
      window.location.href = `/campaigns?workspaceId=${encodeURIComponent(
        workspaceId
      )}`;
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-600">
            <Link
              className="text-indigo-700 hover:underline"
              href={`/campaigns?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              ← Campaigns
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">
            {campaign ? campaign.name : "Campaign"}
          </h1>
          <div className="text-xs text-gray-600 mt-1">
            Campaign <span className="font-mono">{campaignId}</span> · workspace{" "}
            <span className="font-mono">{workspaceId}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="text-sm border rounded px-3 py-2 disabled:opacity-50"
            onClick={loadAll}
            disabled={saving}
          >
            Refresh
          </button>
          <button
            className="text-sm border rounded px-3 py-2 disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            Save
          </button>
          <button
            className="text-sm bg-indigo-600 text-white rounded px-3 py-2 disabled:opacity-50"
            onClick={trigger}
            disabled={saving}
          >
            Trigger
          </button>
          <button
            className="text-sm border rounded px-3 py-2 text-red-700 disabled:opacity-50"
            onClick={remove}
            disabled={saving}
          >
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      <div className="bg-white border rounded">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Settings</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Name</div>
              <input
                className="w-full border rounded px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Status</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
              </select>
            </label>
          </div>

          <label className="text-sm block">
            <div className="text-gray-600 mb-1">Description</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Template</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.key})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Segment</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
              >
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Sender profile</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={senderProfileId}
                onChange={(e) => setSenderProfileId(e.target.value)}
              >
                {senderProfiles.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {(sp.fromName ? `${sp.fromName} ` : "") + `<${sp.fromEmail}>`}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                <Link
                  className="text-indigo-700 hover:underline"
                  href={`/sender-profiles?workspaceId=${encodeURIComponent(workspaceId)}`}
                >
                  Manage sender profiles
                </Link>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Schedule</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
              >
                <option value="MANUAL">MANUAL</option>
                <option value="CRON">CRON</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Cron expression</div>
              <input
                className="w-full border rounded px-3 py-2 font-mono text-xs"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                disabled={scheduleType !== "CRON"}
              />
              <div className="text-xs text-gray-500 mt-1">
                Enabled only when schedule is CRON.
              </div>
            </label>
          </div>

          <label className="text-sm block">
            <div className="text-gray-600 mb-1">Rate limit (emails/sec)</div>
            <input
              className="w-full border rounded px-3 py-2"
              type="number"
              min={1}
              max={1000}
              value={rateLimitPerSecond}
              onChange={(e) =>
                setRateLimitPerSecond(parseInt(e.target.value || "10", 10))
              }
            />
          </label>
        </div>
      </div>

      <div className="bg-white border rounded">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent runs</h2>
          <span className="text-xs text-gray-500">
            {campaign?.runs?.length ?? 0}
          </span>
        </div>
        <div className="divide-y">
          {(campaign?.runs ?? []).map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{r.status}</div>
                <div className="text-xs text-gray-600 font-mono">{r.id}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {r.stats ? `stats: ${JSON.stringify(r.stats)}` : "stats: —"}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {(campaign?.runs?.length ?? 0) === 0 ? (
            <div className="px-4 py-10 text-sm text-gray-600">
              No runs yet. Click <span className="font-semibold">Trigger</span>.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

