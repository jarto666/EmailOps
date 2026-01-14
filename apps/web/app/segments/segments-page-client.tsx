"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

type Connector = {
  id: string;
  name: string;
  type: string;
};

type Segment = {
  id: string;
  name: string;
  dataConnectorId: string;
  sqlQuery: string;
  dataConnector?: Connector;
};

export default function SegmentsPageClient({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [items, setItems] = useState<Segment[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [dataConnectorId, setDataConnectorId] = useState("");
  const [sqlQuery, setSqlQuery] = useState(
    `select\n  'user_1'::text as recipient_id,\n  'user1@example.com'::text as email,\n  jsonb_build_object('user', jsonb_build_object('firstName','Ava')) as vars`
  );

  const listUrl = useMemo(
    () => `/segments?workspaceId=${encodeURIComponent(workspaceId)}`,
    [workspaceId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [segmentsData, connectorsData] = await Promise.all([
        apiFetch<Segment[]>("/segments", { query: { workspaceId } }),
        apiFetch<Connector[]>("/data-connectors", { query: { workspaceId } }),
      ]);
      setItems(segmentsData);
      setConnectors(connectorsData);
      if (!dataConnectorId && connectorsData[0]?.id)
        setDataConnectorId(connectorsData[0].id);
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

  async function createSegment() {
    setError(null);
    try {
      await apiFetch<Segment>("/segments", {
        method: "POST",
        body: JSON.stringify({ workspaceId, name, dataConnectorId, sqlQuery }),
      });
      setName("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Segments</h1>
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
        <h2 className="font-semibold mb-3">Create segment</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Name</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Active users (last 30 days)"
            />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Connector</div>
            {connectors.length > 0 ? (
              <select
                className="w-full border rounded px-3 py-2"
                value={dataConnectorId}
                onChange={(e) => setDataConnectorId(e.target.value)}
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
                value={dataConnectorId}
                onChange={(e) => setDataConnectorId(e.target.value)}
                placeholder="dataConnectorId (no connectors found)"
              />
            )}
          </label>
        </div>
        <label className="text-sm block mt-3">
          <div className="text-gray-600 mb-1">SQL query</div>
          <textarea
            className="w-full border rounded px-3 py-2 font-mono text-xs h-44"
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
          />
          <div className="text-xs text-gray-500 mt-1">
            Must be a single SELECT/WITH statement. Recommended columns:{" "}
            <span className="font-mono">recipient_id</span>,{" "}
            <span className="font-mono">email</span>,{" "}
            <span className="font-mono">vars</span>.
          </div>
        </label>
        <div className="mt-3 flex gap-3">
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
            onClick={createSegment}
            disabled={!name || !dataConnectorId || !sqlQuery}
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
          <h2 className="font-semibold">All segments</h2>
          <span className="text-xs text-gray-500">
            {loading ? "Loading…" : `${items.length} items`}
          </span>
        </div>
        <div className="divide-y">
          {items.map((s) => (
            <div
              key={s.id}
              className="px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  <Link
                    className="text-indigo-700 hover:underline"
                    href={`/segments/${s.id}?workspaceId=${encodeURIComponent(
                      workspaceId
                    )}`}
                  >
                    {s.name}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">
                  Connector:{" "}
                  <span className="font-mono">
                    {s.dataConnector?.name ?? s.dataConnectorId}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-mono">{s.id}</div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="px-4 py-10 text-sm text-gray-600">
              No segments yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

