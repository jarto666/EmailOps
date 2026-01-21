"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

type Journey = {
  id: string;
  name: string;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "ARCHIVED";
  versions?: Array<{ id: string; version: number; publishedAt?: string | null }>;
};

export default function JourneysPageClient({ workspaceId }: { workspaceId: string }) {
  const [items, setItems] = useState<Journey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const listUrl = useMemo(
    () => `/journeys?workspaceId=${encodeURIComponent(workspaceId)}`,
    [workspaceId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Journey[]>("/journeys", { query: { workspaceId } });
      setItems(data);
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

  async function createJourney() {
    setError(null);
    try {
      const j = await apiFetch<Journey>("/journeys", {
        method: "POST",
        body: JSON.stringify({ workspaceId, name }),
      });
      setName("");
      window.location.href = `/journeys/${j.id}?workspaceId=${encodeURIComponent(workspaceId)}`;
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Journeys</h1>
          <p className="text-sm text-gray-600">
            Workspace:{" "}
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
              {workspaceId}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">{listUrl}</p>
        </div>
        <a className="text-sm text-indigo-600 hover:underline" href={`/?workspaceId=${encodeURIComponent(workspaceId)}`}>
          Back to dashboard
        </a>
      </div>

      <div className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-3">Create journey</h2>
        <div className="flex gap-3 items-end">
          <label className="text-sm flex-1">
            <div className="text-gray-600 mb-1">Name</div>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome series" />
          </label>
          <button className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50" onClick={createJourney} disabled={!name}>
            Create
          </button>
          <button className="px-4 py-2 rounded border text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-red-600 whitespace-pre-wrap">{error}</div> : null}
      </div>

      <div className="bg-white border rounded">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">All journeys</h2>
          <span className="text-xs text-gray-500">{loading ? "Loading…" : `${items.length} items`}</span>
        </div>
        <div className="divide-y">
          {items.map((j) => (
            <div key={j.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  <Link className="text-indigo-700 hover:underline" href={`/journeys/${j.id}?workspaceId=${encodeURIComponent(workspaceId)}`}>
                    {j.name}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">{j.status}</div>
              </div>
              <div className="text-xs text-gray-500 font-mono">{j.id}</div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="px-4 py-10 text-sm text-gray-600">No journeys yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

