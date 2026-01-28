"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";

type Journey = {
  id: string;
  name: string;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "ARCHIVED";
  versions: Array<{ id: string; version: number; publishedAt?: string | null }>;
};

type JourneyNodeType = "ENTRY_EVENT" | "DELAY" | "CONDITION" | "SEND_EMAIL" | "EXIT";

type DraftNode = {
  nodeKey: string;
  type: JourneyNodeType;
  config?: any;
};

type DraftEdge = {
  fromNodeKey: string;
  toNodeKey: string;
  condition?: any;
};

type JourneyVersion = {
  id: string;
  version: number;
  publishedAt?: string | null;
  nodes: DraftNode[];
  edges: DraftEdge[];
};

type Template = { id: string; name: string; key: string };
type SenderProfile = { id: string; fromEmail: string; fromName?: string | null };

function safeParseJson(s: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    return { ok: true as const, value: JSON.parse(s) };
  } catch (e: any) {
    return { ok: false as const, error: String(e?.message ?? e) };
  }
}

function stableStringify(v: any) {
  return JSON.stringify(v ?? null, null, 2);
}

function nextNodeKey(nodes: DraftNode[], type: JourneyNodeType) {
  const prefix =
    type === "ENTRY_EVENT"
      ? "entry"
      : type === "EXIT"
        ? "exit"
        : type === "DELAY"
          ? "delay"
          : type === "SEND_EMAIL"
            ? "send"
            : "cond";

  const existing = new Set(nodes.map((n) => n.nodeKey));
  if (!existing.has(prefix)) return prefix;
  for (let i = 2; i < 1000; i++) {
    const k = `${prefix}${i}`;
    if (!existing.has(k)) return k;
  }
  return `${prefix}${Date.now()}`;
}

function validateDraft(nodes: DraftNode[], edges: DraftEdge[]) {
  const errs: string[] = [];
  const nodeKeys = nodes.map((n) => n.nodeKey);
  const nodeKeySet = new Set(nodeKeys.filter((k) => k.trim().length > 0));

  if (nodes.some((n) => typeof n.nodeKey !== "string" || n.nodeKey.trim().length === 0)) {
    errs.push("Every node must have a non-empty nodeKey.");
  }
  if (nodeKeySet.size !== nodes.length) {
    errs.push("nodeKey must be unique (duplicate found).");
  }

  const entryCount = nodes.filter((n) => n.type === "ENTRY_EVENT").length;
  if (entryCount !== 1) {
    errs.push("Exactly one ENTRY_EVENT node is required.");
  }

  for (const e of edges) {
    if (!nodeKeySet.has(e.fromNodeKey) || !nodeKeySet.has(e.toNodeKey)) {
      errs.push(`Edge references unknown nodeKey: ${e.fromNodeKey} -> ${e.toNodeKey}`);
      break;
    }
    if (e.fromNodeKey === e.toNodeKey) {
      errs.push(`Edge cannot point to itself: ${e.fromNodeKey} -> ${e.toNodeKey}`);
      break;
    }
  }

  return errs;
}

export default function JourneyEditor({
  journeyId,
  workspaceId,
}: {
  journeyId: string;
  workspaceId: string;
}) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [version, setVersion] = useState<JourneyVersion | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<Journey["status"]>("DRAFT");

  const [draftNodes, setDraftNodes] = useState<DraftNode[]>([]);
  const [draftEdges, setDraftEdges] = useState<DraftEdge[]>([]);
  const [advancedJson, setAdvancedJson] = useState("");
  const [editorMode, setEditorMode] = useState<"builder" | "advanced">("builder");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>([]);

  const [newNodeType, setNewNodeType] = useState<JourneyNodeType>("DELAY");
  const [newEdgeFrom, setNewEdgeFrom] = useState<string>("");
  const [newEdgeTo, setNewEdgeTo] = useState<string>("");
  const [newEdgeConditionJson, setNewEdgeConditionJson] = useState<string>("{}");

  const versionLabel = useMemo(() => {
    if (!journey?.versions?.length) return "—";
    const v = journey.versions.find((x) => x.id === selectedVersionId) ?? journey.versions[0];
    return `v${v.version}${v.publishedAt ? " (published)" : " (draft)"}`;
  }, [journey?.versions, selectedVersionId]);

  const draftErrors = useMemo(() => validateDraft(draftNodes, draftEdges), [draftNodes, draftEdges]);
  const isDraftValid = draftErrors.length === 0;

  const nodeKeyOptions = useMemo(() => draftNodes.map((n) => n.nodeKey).filter(Boolean), [draftNodes]);

  const computedAdvancedJson = useMemo(() => stableStringify({ nodes: draftNodes, edges: draftEdges }), [draftNodes, draftEdges]);

  async function loadAll() {
    setError(null);
    try {
      const j = await apiFetch<Journey>(`/journeys/${journeyId}`, { query: { workspaceId } });
      setJourney(j);
      setName(j.name);
      setStatus(j.status);
      const latest = j.versions?.[0]?.id ?? null;
      setSelectedVersionId((prev) => prev ?? latest);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  async function loadPicklists() {
    try {
      const [t, sp] = await Promise.all([
        apiFetch<Template[]>("/templates", { query: { workspaceId } }),
        apiFetch<SenderProfile[]>("/sender-profiles", { query: { workspaceId } }),
      ]);
      setTemplates(t);
      setSenderProfiles(sp);
    } catch {
      // Optional: keep editor usable even if picklists fail.
    }
  }

  async function loadVersion(versionId: string) {
    setError(null);
    try {
      const v = await apiFetch<JourneyVersion>(`/journeys/${journeyId}/versions/${versionId}`, {
        query: { workspaceId },
      });
      setVersion(v);
      setDraftNodes((v.nodes ?? []) as DraftNode[]);
      setDraftEdges((v.edges ?? []) as DraftEdge[]);
      setAdvancedJson(stableStringify({ nodes: v.nodes ?? [], edges: v.edges ?? [] }));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    loadAll();
    loadPicklists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId, workspaceId]);

  useEffect(() => {
    if (selectedVersionId) loadVersion(selectedVersionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionId]);

  async function saveMeta() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/journeys/${journeyId}`, {
        method: "PATCH",
        query: { workspaceId },
        body: JSON.stringify({ name, status }),
      });
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function insertTemplateWelcomeSeries() {
    const nodes: DraftNode[] = [
      { nodeKey: "entry", type: "ENTRY_EVENT", config: { eventName: "UserRegistered" } },
      { nodeKey: "delay1", type: "DELAY", config: { seconds: 10 } },
      { nodeKey: "send1", type: "SEND_EMAIL", config: { templateId: "", senderProfileId: "" } },
      { nodeKey: "exit", type: "EXIT" },
    ];
    const edges: DraftEdge[] = [
      { fromNodeKey: "entry", toNodeKey: "delay1" },
      { fromNodeKey: "delay1", toNodeKey: "send1" },
      { fromNodeKey: "send1", toNodeKey: "exit" },
    ];
    setDraftNodes(nodes);
    setDraftEdges(edges);
    setAdvancedJson(stableStringify({ nodes, edges }));
    setEditorMode("builder");
  }

  async function saveDraftGraph() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/journeys/${journeyId}/draft`, {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          nodes: draftNodes ?? [],
          edges: draftEdges ?? [],
        }),
      });
      await loadAll();
      if (selectedVersionId) await loadVersion(selectedVersionId);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/journeys/${journeyId}/publish`, {
        method: "POST",
        body: JSON.stringify({ workspaceId }),
      });
      await loadAll();
      if (selectedVersionId) await loadVersion(selectedVersionId);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function addNode() {
    const k = nextNodeKey(draftNodes, newNodeType);
    const base: DraftNode =
      newNodeType === "ENTRY_EVENT"
        ? { nodeKey: k, type: newNodeType, config: { eventName: "UserRegistered" } }
        : newNodeType === "DELAY"
          ? { nodeKey: k, type: newNodeType, config: { seconds: 10 } }
          : newNodeType === "SEND_EMAIL"
            ? { nodeKey: k, type: newNodeType, config: { templateId: "", senderProfileId: "" } }
            : newNodeType === "CONDITION"
              ? { nodeKey: k, type: newNodeType, config: {} }
              : { nodeKey: k, type: newNodeType };

    setDraftNodes((prev) => [...prev, base]);
    // set reasonable defaults for edge creation UI
    setNewEdgeFrom((prev) => prev || k);
  }

  function removeNode(nodeKey: string) {
    setDraftNodes((prev) => prev.filter((n) => n.nodeKey !== nodeKey));
    setDraftEdges((prev) => prev.filter((e) => e.fromNodeKey !== nodeKey && e.toNodeKey !== nodeKey));
  }

  function updateNode(nodeKey: string, patch: Partial<DraftNode>) {
    setDraftNodes((prev) =>
      prev.map((n) => (n.nodeKey === nodeKey ? { ...n, ...patch } : n))
    );
  }

  function renameNode(oldKey: string, newKey: string) {
    const nk = newKey.trim();
    setDraftNodes((prev) => prev.map((n) => (n.nodeKey === oldKey ? { ...n, nodeKey: nk } : n)));
    setDraftEdges((prev) =>
      prev.map((e) => ({
        ...e,
        fromNodeKey: e.fromNodeKey === oldKey ? nk : e.fromNodeKey,
        toNodeKey: e.toNodeKey === oldKey ? nk : e.toNodeKey,
      }))
    );
  }

  function addEdge() {
    const from = newEdgeFrom.trim();
    const to = newEdgeTo.trim();
    if (!from || !to) return;
    const parsed = safeParseJson(newEdgeConditionJson);
    setDraftEdges((prev) => [
      ...prev,
      {
        fromNodeKey: from,
        toNodeKey: to,
        condition: parsed.ok ? parsed.value : undefined,
      },
    ]);
    setNewEdgeConditionJson("{}");
  }

  function removeEdge(idx: number) {
    setDraftEdges((prev) => prev.filter((_, i) => i !== idx));
  }

  function syncAdvancedToDraft() {
    const parsed = safeParseJson(advancedJson);
    if (parsed.ok === false) {
      setError(`Advanced JSON is invalid: ${parsed.error}`);
      return;
    }
    const nodes = Array.isArray(parsed.value?.nodes) ? (parsed.value.nodes as DraftNode[]) : [];
    const edges = Array.isArray(parsed.value?.edges) ? (parsed.value.edges as DraftEdge[]) : [];
    setDraftNodes(nodes);
    setDraftEdges(edges);
    setError(null);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-600">
            <Link className="text-indigo-700 hover:underline" href={`/journeys?workspaceId=${encodeURIComponent(workspaceId)}`}>
              ← Journeys
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">{journey ? journey.name : "Journey"}</h1>
          <div className="text-xs text-gray-600 mt-1">
            id <span className="font-mono">{journeyId}</span> · {versionLabel}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="text-sm border rounded px-3 py-2 disabled:opacity-50" onClick={loadAll} disabled={saving}>
            Refresh
          </button>
          <button
            className="text-sm border rounded px-3 py-2 disabled:opacity-50"
            onClick={insertTemplateWelcomeSeries}
            disabled={saving}
            title="Insert a simple Welcome Series template"
          >
            Insert template
          </button>
          <button className="text-sm border rounded px-3 py-2 disabled:opacity-50" onClick={saveMeta} disabled={saving}>
            Save meta
          </button>
          <button
            className="text-sm border rounded px-3 py-2 disabled:opacity-50"
            onClick={saveDraftGraph}
            disabled={saving || !isDraftValid}
            title={!isDraftValid ? "Fix validation errors before saving." : undefined}
          >
            Save draft
          </button>
          <button
            className="text-sm bg-indigo-600 text-white rounded px-3 py-2 disabled:opacity-50"
            onClick={publish}
            disabled={saving || !isDraftValid}
            title={!isDraftValid ? "Fix validation errors before publishing." : undefined}
          >
            Publish
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Versions</h2>
            <span className="text-xs text-gray-500">{journey?.versions?.length ?? 0}</span>
          </div>
          <div className="divide-y">
            {(journey?.versions ?? []).map((v) => (
              <button
                key={v.id}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${v.id === selectedVersionId ? "bg-indigo-50" : ""}`}
                onClick={() => setSelectedVersionId(v.id)}
              >
                <div className="font-medium">
                  v{v.version} {v.publishedAt ? "(published)" : "(draft)"}
                </div>
                <div className="text-xs text-gray-600 font-mono">{v.id}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded lg:col-span-2">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">Definition</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <label className="text-sm md:col-span-2">
                <div className="text-gray-600 mb-1">Name</div>
                <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="text-sm">
                <div className="text-gray-600 mb-1">Status</div>
                <select className="w-full border rounded px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="RUNNING">RUNNING</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                className={`text-sm border rounded px-3 py-1.5 ${editorMode === "builder" ? "bg-indigo-50 border-indigo-200 text-indigo-800" : ""}`}
                onClick={() => setEditorMode("builder")}
                type="button"
              >
                Builder
              </button>
              <button
                className={`text-sm border rounded px-3 py-1.5 ${editorMode === "advanced" ? "bg-indigo-50 border-indigo-200 text-indigo-800" : ""}`}
                onClick={() => {
                  setAdvancedJson(computedAdvancedJson);
                  setEditorMode("advanced");
                }}
                type="button"
              >
                Advanced (JSON)
              </button>
              <div className="text-xs text-gray-500 ml-auto">
                Loaded nodes: <span className="font-mono">{version?.nodes?.length ?? 0}</span> · edges:{" "}
                <span className="font-mono">{version?.edges?.length ?? 0}</span>
              </div>
            </div>

            {draftErrors.length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded p-3 text-sm">
                <div className="font-semibold mb-1">Fix before saving/publishing</div>
                <ul className="list-disc pl-5 space-y-1">
                  {draftErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {editorMode === "builder" ? (
              <div className="space-y-6">
                <div className="bg-gray-50 border rounded p-3">
                  <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <label className="text-sm">
                      <div className="text-gray-600 mb-1">Add node</div>
                      <select
                        className="border rounded px-3 py-2"
                        value={newNodeType}
                        onChange={(e) => setNewNodeType(e.target.value as JourneyNodeType)}
                      >
                        <option value="ENTRY_EVENT">ENTRY_EVENT</option>
                        <option value="DELAY">DELAY</option>
                        <option value="SEND_EMAIL">SEND_EMAIL</option>
                        <option value="CONDITION">CONDITION</option>
                        <option value="EXIT">EXIT</option>
                      </select>
                    </label>
                    <button className="text-sm bg-indigo-600 text-white rounded px-3 py-2" onClick={addNode} type="button">
                      Add
                    </button>
                    <div className="text-xs text-gray-500 md:ml-auto">
                      Tip: you need exactly one <span className="font-mono">ENTRY_EVENT</span>.
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold mb-2">Nodes</div>
                  <div className="space-y-2">
                    {draftNodes.map((n) => {
                      const cfg = n.config ?? {};
                      const isSend = n.type === "SEND_EMAIL";
                      const isDelay = n.type === "DELAY";
                      const isEntry = n.type === "ENTRY_EVENT";
                      const isCondition = n.type === "CONDITION";

                      return (
                        <div key={n.nodeKey} className="border rounded p-3 bg-white">
                          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                            <label className="text-sm">
                              <div className="text-gray-600 mb-1">nodeKey</div>
                              <input
                                className="border rounded px-3 py-2 font-mono text-xs w-56"
                                value={n.nodeKey}
                                onChange={(e) => renameNode(n.nodeKey, e.target.value)}
                              />
                            </label>
                            <label className="text-sm">
                              <div className="text-gray-600 mb-1">type</div>
                              <select
                                className="border rounded px-3 py-2"
                                value={n.type}
                                onChange={(e) => {
                                  const t = e.target.value as JourneyNodeType;
                                  const baseCfg =
                                    t === "ENTRY_EVENT"
                                      ? { eventName: cfg?.eventName ?? "UserRegistered" }
                                      : t === "DELAY"
                                        ? { seconds: Number(cfg?.seconds ?? 10) }
                                        : t === "SEND_EMAIL"
                                          ? {
                                              templateId: String(cfg?.templateId ?? ""),
                                              senderProfileId: String(cfg?.senderProfileId ?? ""),
                                            }
                                          : t === "CONDITION"
                                            ? cfg ?? {}
                                            : undefined;
                                  updateNode(n.nodeKey, { type: t, config: baseCfg });
                                }}
                              >
                                <option value="ENTRY_EVENT">ENTRY_EVENT</option>
                                <option value="DELAY">DELAY</option>
                                <option value="SEND_EMAIL">SEND_EMAIL</option>
                                <option value="CONDITION">CONDITION</option>
                                <option value="EXIT">EXIT</option>
                              </select>
                            </label>

                            {isEntry ? (
                              <label className="text-sm flex-1">
                                <div className="text-gray-600 mb-1">eventName</div>
                                <input
                                  className="w-full border rounded px-3 py-2"
                                  value={String(cfg?.eventName ?? "")}
                                  onChange={(e) => updateNode(n.nodeKey, { config: { ...cfg, eventName: e.target.value } })}
                                  placeholder="UserRegistered"
                                />
                              </label>
                            ) : null}

                            {isDelay ? (
                              <label className="text-sm flex-1">
                                <div className="text-gray-600 mb-1">delay (seconds)</div>
                                <input
                                  className="w-full border rounded px-3 py-2"
                                  type="number"
                                  min={0}
                                  value={Number(cfg?.seconds ?? 0)}
                                  onChange={(e) => updateNode(n.nodeKey, { config: { ...cfg, seconds: Number(e.target.value || 0) } })}
                                />
                              </label>
                            ) : null}

                            {isSend ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                                <label className="text-sm">
                                  <div className="text-gray-600 mb-1">template</div>
                                  {templates.length ? (
                                    <select
                                      className="w-full border rounded px-3 py-2"
                                      value={String(cfg?.templateId ?? "")}
                                      onChange={(e) => updateNode(n.nodeKey, { config: { ...cfg, templateId: e.target.value } })}
                                    >
                                      <option value="">— Select template —</option>
                                      {templates.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.name} ({t.key})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      className="w-full border rounded px-3 py-2 font-mono text-xs"
                                      value={String(cfg?.templateId ?? "")}
                                      onChange={(e) => updateNode(n.nodeKey, { config: { ...cfg, templateId: e.target.value } })}
                                      placeholder="templateId"
                                    />
                                  )}
                                </label>
                                <label className="text-sm">
                                  <div className="text-gray-600 mb-1">sender profile</div>
                                  {senderProfiles.length ? (
                                    <select
                                      className="w-full border rounded px-3 py-2"
                                      value={String(cfg?.senderProfileId ?? "")}
                                      onChange={(e) =>
                                        updateNode(n.nodeKey, { config: { ...cfg, senderProfileId: e.target.value } })
                                      }
                                    >
                                      <option value="">— Select sender profile —</option>
                                      {senderProfiles.map((sp) => (
                                        <option key={sp.id} value={sp.id}>
                                          {sp.fromName ? `${sp.fromName} <${sp.fromEmail}>` : sp.fromEmail}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      className="w-full border rounded px-3 py-2 font-mono text-xs"
                                      value={String(cfg?.senderProfileId ?? "")}
                                      onChange={(e) => updateNode(n.nodeKey, { config: { ...cfg, senderProfileId: e.target.value } })}
                                      placeholder="senderProfileId"
                                    />
                                  )}
                                </label>
                              </div>
                            ) : null}

                            {isCondition ? (
                              <label className="text-sm flex-1">
                                <div className="text-gray-600 mb-1">condition config (JSON)</div>
                                <input
                                  className="w-full border rounded px-3 py-2 font-mono text-xs"
                                  value={stableStringify(cfg).replace(/\n/g, " ")}
                                  onChange={(e) => {
                                    const parsed = safeParseJson(e.target.value);
                                    updateNode(n.nodeKey, { config: parsed.ok ? parsed.value : cfg });
                                  }}
                                  placeholder='{"op":"eq","field":"plan","value":"pro"}'
                                />
                              </label>
                            ) : null}

                            <button
                              className="text-sm border border-red-300 text-red-700 rounded px-3 py-2 hover:bg-red-50"
                              onClick={() => removeNode(n.nodeKey)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {draftNodes.length === 0 ? (
                      <div className="text-sm text-gray-600 border rounded p-6 bg-white">
                        No nodes yet. Add an <span className="font-mono">ENTRY_EVENT</span>, then build out your flow.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="font-semibold mb-2">Edges</div>
                  <div className="bg-gray-50 border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <label className="text-sm">
                        <div className="text-gray-600 mb-1">from</div>
                        <select
                          className="w-full border rounded px-3 py-2"
                          value={newEdgeFrom}
                          onChange={(e) => setNewEdgeFrom(e.target.value)}
                        >
                          <option value="">—</option>
                          {nodeKeyOptions.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm">
                        <div className="text-gray-600 mb-1">to</div>
                        <select className="w-full border rounded px-3 py-2" value={newEdgeTo} onChange={(e) => setNewEdgeTo(e.target.value)}>
                          <option value="">—</option>
                          {nodeKeyOptions.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex gap-2 items-end">
                        <button className="text-sm bg-indigo-600 text-white rounded px-3 py-2 disabled:opacity-50" onClick={addEdge} type="button" disabled={!newEdgeFrom || !newEdgeTo}>
                          Add edge
                        </button>
                      </div>
                    </div>
                    <label className="text-sm block mt-3">
                      <div className="text-gray-600 mb-1">condition (optional JSON)</div>
                      <input
                        className="w-full border rounded px-3 py-2 font-mono text-xs"
                        value={newEdgeConditionJson}
                        onChange={(e) => setNewEdgeConditionJson(e.target.value)}
                        placeholder="{}"
                      />
                    </label>
                  </div>

                  <div className="mt-3 space-y-2">
                    {draftEdges.map((e, idx) => (
                      <div key={`${e.fromNodeKey}->${e.toNodeKey}:${idx}`} className="border rounded px-3 py-2 bg-white flex items-center justify-between gap-3">
                        <div className="text-sm">
                          <span className="font-mono text-xs">{e.fromNodeKey}</span> <span className="text-gray-400">→</span>{" "}
                          <span className="font-mono text-xs">{e.toNodeKey}</span>
                          {e.condition ? (
                            <span className="ml-2 text-xs text-gray-500 font-mono">cond: {stableStringify(e.condition).replace(/\n/g, " ")}</span>
                          ) : null}
                        </div>
                        <button className="text-sm border border-red-300 text-red-700 rounded px-3 py-1.5 hover:bg-red-50" onClick={() => removeEdge(idx)} type="button">
                          Delete
                        </button>
                      </div>
                    ))}
                    {draftEdges.length === 0 ? (
                      <div className="text-sm text-gray-600 border rounded p-6 bg-white">No edges yet. Connect your nodes to define flow order.</div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="font-semibold mb-2">Preview</div>
                  <div className="border rounded p-3 bg-white">
                    <div className="flex flex-wrap gap-2">
                      {draftNodes.map((n) => (
                        <span key={n.nodeKey} className="inline-flex items-center gap-2 border rounded px-2.5 py-1 text-xs bg-gray-50">
                          <span className="font-mono">{n.nodeKey}</span>
                          <span className="text-gray-500">{n.type}</span>
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      {draftEdges.length ? (
                        <div className="space-y-1">
                          {draftEdges.map((e, idx) => (
                            <div key={idx} className="font-mono">
                              {e.fromNodeKey} → {e.toNodeKey}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>Add edges to see flow.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm block">
                  <div className="text-gray-600 mb-1">Graph JSON</div>
                  <textarea
                    className="w-full border rounded px-3 py-2 font-mono text-xs h-72"
                    value={advancedJson}
                    onChange={(e) => setAdvancedJson(e.target.value)}
                  />
                </label>
                <div className="flex gap-2">
                  <button className="text-sm border rounded px-3 py-2" onClick={() => setAdvancedJson(computedAdvancedJson)} type="button">
                    Reset to current draft
                  </button>
                  <button className="text-sm bg-indigo-600 text-white rounded px-3 py-2" onClick={syncAdvancedToDraft} type="button">
                    Apply JSON to draft
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Schema: nodes[] = {"{ nodeKey, type, config }"}, edges[] = {"{ fromNodeKey, toNodeKey, condition }"}.
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Saves via{" "}
              <span className="font-mono">POST /journeys/:id/draft</span>, publishes via{" "}
              <span className="font-mono">POST /journeys/:id/publish</span>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

