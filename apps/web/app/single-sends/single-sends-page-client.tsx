"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

type SingleSendStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" | "COMPLETED";
type ScheduleType = "MANUAL" | "CRON";

type Template = { id: string; name: string; key: string };
type Segment = { id: string; name: string };
type SenderProfile = { id: string; fromEmail: string; fromName?: string | null };

type SingleSend = {
  id: string;
  name: string;
  description?: string | null;
  status: SingleSendStatus;
  scheduleType: ScheduleType;
  cronExpression?: string | null;
  template?: Template;
  segment?: Segment;
  senderProfile?: SenderProfile;
};

export default function SingleSendsPageClient({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [items, setItems] = useState<SingleSend[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [senderProfileId, setSenderProfileId] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("MANUAL");
  const [cronExpression, setCronExpression] = useState("0 * * * *");
  const [rateLimitPerSecond, setRateLimitPerSecond] = useState<number>(10);

  const listUrl = useMemo(
    () => `/single-sends?workspaceId=${encodeURIComponent(workspaceId)}`,
    [workspaceId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [singleSendsData, templatesData, segmentsData, senderProfilesData] =
        await Promise.all([
          apiFetch<SingleSend[]>("/single-sends", { query: { workspaceId } }),
          apiFetch<any[]>("/templates", { query: { workspaceId } }),
          apiFetch<any[]>("/segments", { query: { workspaceId } }),
          apiFetch<any[]>("/sender-profiles", { query: { workspaceId } }),
        ]);

      setItems(singleSendsData);
      setTemplates(
        templatesData.map((t) => ({ id: t.id, name: t.name, key: t.key }))
      );
      setSegments(segmentsData.map((s) => ({ id: s.id, name: s.name })));
      setSenderProfiles(
        senderProfilesData.map((sp) => ({
          id: sp.id,
          fromEmail: sp.fromEmail,
          fromName: sp.fromName ?? null,
        }))
      );

      if (!templateId && templatesData[0]?.id) setTemplateId(templatesData[0].id);
      if (!segmentId && segmentsData[0]?.id) setSegmentId(segmentsData[0].id);
      if (!senderProfileId && senderProfilesData[0]?.id)
        setSenderProfileId(senderProfilesData[0].id);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function createSingleSend() {
    setError(null);
    try {
      const policies = { rateLimitPerSecond };
      await apiFetch<SingleSend>("/single-sends", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          name,
          description: description || undefined,
          templateId,
          segmentId,
          senderProfileId,
          scheduleType,
          cronExpression: scheduleType === "CRON" ? cronExpression : undefined,
          policies,
        }),
      });
      setName("");
      setDescription("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Single sends</h1>
          <p className="text-sm text-gray-600">
            Workspace:{" "}
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
              {workspaceId}
            </span>{" "}
            <span className="text-gray-400">(change via URL)</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">{listUrl}</p>
        </div>
        <a
          className="text-sm text-indigo-600 hover:underline"
          href={`/?workspaceId=${encodeURIComponent(workspaceId)}`}
        >
          Back to dashboard
        </a>
      </div>

      <div className="bg-white border rounded p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Create single send</h2>
          <div className="text-xs text-gray-500">
            Need a sender profile?{" "}
            <Link
              className="text-indigo-700 hover:underline"
              href={`/sender-profiles?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              Manage sender profiles
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-3">
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Name</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly newsletter"
            />
          </label>
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
        </div>

        <label className="text-sm block mt-3">
          <div className="text-gray-600 mb-1">Description</div>
          <input
            className="w-full border rounded px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-3">
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
          </label>
        </div>

        {scheduleType === "CRON" ? (
          <label className="text-sm block mt-3">
            <div className="text-gray-600 mb-1">Cron expression</div>
            <input
              className="w-full border rounded px-3 py-2 font-mono text-xs"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 * * * *"
            />
          </label>
        ) : null}

        <label className="text-sm block mt-3">
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

        <div className="mt-3 flex gap-3">
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
            onClick={createSingleSend}
            disabled={!name || !templateId || !segmentId || !senderProfileId}
          >
            Create
          </button>
          <button
            className="px-4 py-2 rounded border text-sm"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-3 text-sm text-red-600 whitespace-pre-wrap">
            {error}
          </div>
        ) : null}
      </div>

      <div className="bg-white border rounded">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">All single sends</h2>
          <span className="text-xs text-gray-500">
            {loading ? "Loading…" : `${items.length} items`}
          </span>
        </div>
        <div className="divide-y">
          {items.map((ss) => (
            <div key={ss.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  <Link
                    className="text-indigo-700 hover:underline"
                    href={`/single-sends/${ss.id}?workspaceId=${encodeURIComponent(
                      workspaceId
                    )}`}
                  >
                    {ss.name}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">
                  {ss.status} · {ss.scheduleType}
                  {ss.scheduleType === "CRON" && ss.cronExpression
                    ? ` · ${ss.cronExpression}`
                    : ""}
                </div>
              </div>
              <div className="text-xs text-gray-500 font-mono">{ss.id}</div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="px-4 py-10 text-sm text-gray-600">
              No single sends yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

