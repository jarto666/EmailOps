"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

type Connector = {
  id: string;
  name: string;
  type: string;
};

type Segment = {
  id: string;
  name: string;
  connectorId: string;
  sqlQuery: string;
  connector?: Connector;
};

type DryRunResult = {
  count: number;
  rows: any[];
};

export default function SegmentEditor({
  segmentId,
  workspaceId,
}: {
  segmentId: string;
  workspaceId: string;
}) {
  const [segment, setSegment] = useState<Segment | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [connectorId, setConnectorId] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  const [preview, setPreview] = useState<DryRunResult | null>(null);
  const [previewLimit, setPreviewLimit] = useState(25);

  const columns = useMemo(() => {
    const row = preview?.rows?.[0];
    if (!row || typeof row !== "object") return [];
    return Object.keys(row).slice(0, 12);
  }, [preview?.rows]);

  async function loadAll() {
    setError(null);
    try {
      const [s, cs] = await Promise.all([
        apiFetch<any>(`/segments/${segmentId}`, { query: { workspaceId } }),
        apiFetch<Connector[]>("/connectors", { query: { workspaceId } }),
      ]);

      const seg: Segment = {
        id: s.id,
        name: s.name,
        connectorId: s.connectorId,
        sqlQuery: s.sqlQuery,
        connector: s.connector,
      };
      setSegment(seg);
      setConnectors(cs);
      setName(seg.name);
      setConnectorId(seg.connectorId);
      setSqlQuery(seg.sqlQuery);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentId, workspaceId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch<Segment>(`/segments/${segmentId}`, {
        method: "PATCH",
        query: { workspaceId },
        body: JSON.stringify({ name, connectorId, sqlQuery }),
      });
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    setSaving(true);
    setError(null);
    try {
      // If user has unsaved SQL edits, save first so dry-run uses latest query.
      await apiFetch<Segment>(`/segments/${segmentId}`, {
        method: "PATCH",
        query: { workspaceId },
        body: JSON.stringify({ name, connectorId, sqlQuery }),
      });
      const out = await apiFetch<DryRunResult>(`/segments/${segmentId}/dry-run`, {
        method: "POST",
        query: { workspaceId },
        body: JSON.stringify({ limit: previewLimit }),
      });
      setPreview(out);
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this segment?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/segments/${segmentId}`, {
        method: "DELETE",
        query: { workspaceId },
      });
      window.location.href = `/segments?workspaceId=${encodeURIComponent(
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
              href={`/segments?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              ← Segments
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">
            {segment ? segment.name : "Segment"}
          </h1>
          <div className="text-xs text-gray-600 mt-1">
            Segment{" "}
            <span className="font-mono">{segment?.id ?? segmentId}</span> ·
            workspace <span className="font-mono">{workspaceId}</span>
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
          <div className="mt-2">
            <Link
              className="text-indigo-700 hover:underline"
              href={`/segments?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              Back to segments
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded lg:col-span-2">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Definition</h2>
            <div className="flex gap-2">
              <button
                className="text-sm border rounded px-3 py-2 disabled:opacity-50"
                onClick={save}
                disabled={saving}
              >
                Save
              </button>
              <button
                className="text-sm bg-indigo-600 text-white rounded px-3 py-2 disabled:opacity-50"
                onClick={runPreview}
                disabled={saving}
              >
                Run preview
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-sm md:col-span-2">
                <div className="text-gray-600 mb-1">Name</div>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-600 mb-1">Connector</div>
                {connectors.length > 0 ? (
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={connectorId}
                    onChange={(e) => setConnectorId(e.target.value)}
                  >
                    {connectors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full border rounded px-3 py-2 font-mono text-xs"
                    value={connectorId}
                    onChange={(e) => setConnectorId(e.target.value)}
                    placeholder="connectorId"
                  />
                )}
              </label>
            </div>

            <label className="text-sm block">
              <div className="text-gray-600 mb-1">SQL query</div>
              <textarea
                className="w-full border rounded px-3 py-2 font-mono text-xs h-64"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
              />
              <div className="text-xs text-gray-500 mt-1">
                Single SELECT/WITH only. Preview runs with a hard LIMIT and a 5s
                timeout.
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white border rounded">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Preview</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Limit</span>
              <input
                className="w-20 border rounded px-2 py-1"
                type="number"
                min={1}
                max={100}
                value={previewLimit}
                onChange={(e) => setPreviewLimit(parseInt(e.target.value || "25", 10))}
              />
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-sm text-gray-700">
              Count:{" "}
              <span className="font-mono">
                {preview ? preview.count : "—"}
              </span>
            </div>

            {preview && preview.rows.length > 0 ? (
              <div className="border rounded overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {columns.map((c) => (
                        <th
                          key={c}
                          className="text-left font-semibold px-2 py-2 whitespace-nowrap"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.rows.slice(0, previewLimit).map((r, idx) => (
                      <tr key={idx}>
                        {columns.map((c) => (
                          <td key={c} className="px-2 py-2 font-mono">
                            {typeof r?.[c] === "object"
                              ? JSON.stringify(r?.[c])
                              : String(r?.[c] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : preview ? (
              <div className="text-sm text-gray-600">No rows returned.</div>
            ) : (
              <div className="text-sm text-gray-600">
                Click <span className="font-semibold">Run preview</span> to execute the
                query.
              </div>
            )}
            <div className="text-xs text-gray-500">
              Uses API <span className="font-mono">POST /segments/:id/dry-run</span>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

