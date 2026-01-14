"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

type Template = {
  id: string;
  key: string;
  name: string;
  category: "MARKETING" | "TRANSACTIONAL" | "BOTH";
  versions?: Array<{ id: string; name: string; active: boolean }>;
};

export default function TemplatesPageClient({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [items, setItems] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Template["category"]>("MARKETING");

  const listUrl = useMemo(
    () => `/templates?workspaceId=${encodeURIComponent(workspaceId)}`,
    [workspaceId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Template[]>("/templates", {
        query: { workspaceId },
      });
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

  async function createTemplate() {
    setError(null);
    try {
      await apiFetch<Template>("/templates", {
        method: "POST",
        body: JSON.stringify({ workspaceId, key, name, category }),
      });
      setKey("");
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
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-gray-600">
            Workspace:{" "}
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
              {workspaceId}
            </span>{" "}
            <span className="text-gray-400">(change via URL)</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {listUrl}
          </p>
        </div>
        <a
          className="text-sm text-indigo-600 hover:underline"
          href={`/?workspaceId=${encodeURIComponent(workspaceId)}`}
        >
          Back to dashboard
        </a>
      </div>

      <div className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-3">Create template</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Key</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="welcome-email"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Name</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Welcome Email"
            />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Category</div>
            <select
              className="w-full border rounded px-3 py-2"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Template["category"])
              }
            >
              <option value="MARKETING">MARKETING</option>
              <option value="TRANSACTIONAL">TRANSACTIONAL</option>
              <option value="BOTH">BOTH</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex gap-3">
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
            onClick={createTemplate}
            disabled={!key || !name}
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
          <h2 className="font-semibold">All templates</h2>
          <span className="text-xs text-gray-500">
            {loading ? "Loading…" : `${items.length} items`}
          </span>
        </div>
        <div className="divide-y">
          {items.map((t) => {
            const active = t.versions?.[0];
            return (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    <Link
                      className="text-indigo-700 hover:underline"
                      href={`/templates/${t.id}?workspaceId=${encodeURIComponent(
                        workspaceId
                      )}`}
                    >
                      {t.name}
                    </Link>
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-mono">{t.key}</span> · {t.category}
                    {active ? (
                      <>
                        {" "}
                        · Active:{" "}
                        <span className="font-mono">{active.name}</span>
                      </>
                    ) : (
                      <> · Active: none</>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-mono">{t.id}</div>
              </div>
            );
          })}
          {items.length === 0 && !loading ? (
            <div className="px-4 py-10 text-sm text-gray-600">
              No templates yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

