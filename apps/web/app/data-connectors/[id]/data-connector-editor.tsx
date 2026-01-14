"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

type DataConnectorType = "POSTGRES" | "BIGQUERY";
type DataConnector = { id: string; name: string; type: DataConnectorType; config?: any };

function defaultConfigFor(type: DataConnectorType): any {
  switch (type) {
    case "POSTGRES":
      return { connectionString: "postgresql://user:pass@host:5432/db" };
    case "BIGQUERY":
      return { projectId: "my-project", credentials: { client_email: "", private_key: "" } };
    default:
      return {};
  }
}

export default function DataConnectorEditor({
  dataConnectorId,
  workspaceId,
}: {
  dataConnectorId: string;
  workspaceId: string;
}) {
  const [connector, setConnector] = useState<DataConnector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<DataConnectorType>("POSTGRES");
  const [configJson, setConfigJson] = useState(
    JSON.stringify(defaultConfigFor("POSTGRES"), null, 2)
  );

  async function load() {
    setError(null);
    try {
      const c = await apiFetch<DataConnector>(`/data-connectors/${dataConnectorId}`, {
        query: { workspaceId },
      });
      setConnector(c);
      setName(c.name);
      setType(c.type);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataConnectorId, workspaceId]);

  function insertTemplate() {
    setConfigJson(JSON.stringify(defaultConfigFor(type), null, 2));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const config = configJson?.trim()?.length ? JSON.parse(configJson) : undefined;
      await apiFetch<DataConnector>(`/data-connectors/${dataConnectorId}`, {
        method: "PATCH",
        query: { workspaceId },
        body: JSON.stringify({ name, type, config }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setSaving(true);
    setError(null);
    try {
      const config = JSON.parse(configJson || "{}");
      await apiFetch<{ ok: true }>("/data-connectors/test-connection", {
        method: "POST",
        body: JSON.stringify({ type, config }),
      });
      setError("✅ Connection ok");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this data connector?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/data-connectors/${dataConnectorId}`, {
        method: "DELETE",
        query: { workspaceId },
      });
      window.location.href = `/data-connectors?workspaceId=${encodeURIComponent(
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
              href={`/data-connectors?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              ← Data connectors
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">
            {connector ? connector.name : "Data connector"}
          </h1>
          <div className="text-xs text-gray-600 mt-1">
            id <span className="font-mono">{dataConnectorId}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="text-sm border rounded px-3 py-2" onClick={load} disabled={saving}>
            Refresh
          </button>
          <button className="text-sm border rounded px-3 py-2" onClick={testConnection} disabled={saving}>
            Test
          </button>
          <button className="text-sm bg-indigo-600 text-white rounded px-3 py-2" onClick={save} disabled={saving}>
            Save
          </button>
          <button className="text-sm border rounded px-3 py-2 text-red-700" onClick={remove} disabled={saving}>
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
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Settings</h2>
          <button className="text-sm border rounded px-3 py-1.5" type="button" onClick={insertTemplate}>
            Insert template
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Name</div>
              <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Type</div>
              <select className="w-full border rounded px-3 py-2" value={type} onChange={(e) => setType(e.target.value as DataConnectorType)}>
                <option value="POSTGRES">POSTGRES</option>
                <option value="BIGQUERY">BIGQUERY</option>
              </select>
            </label>
          </div>
          <label className="text-sm block">
            <div className="text-gray-600 mb-1">Config (JSON)</div>
            <textarea className="w-full border rounded px-3 py-2 font-mono text-xs h-56" value={configJson} onChange={(e) => setConfigJson(e.target.value)} />
            <div className="text-xs text-gray-500 mt-1">
              Stored secrets are never returned by the API (paste again to test/update).
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

