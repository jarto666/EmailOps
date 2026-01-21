"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

type ConnectorType = "POSTGRES" | "BIGQUERY" | "SES" | "RESEND" | "SMTP";

type Connector = {
  id: string;
  name: string;
  type: ConnectorType;
  config?: any; // always redacted by API
};

function defaultConfigFor(type: ConnectorType): any {
  switch (type) {
    case "POSTGRES":
      return { connectionString: "postgresql://user:pass@host:5432/db" };
    case "SES":
      return { region: "us-east-1", accessKeyId: "AKIA...", secretAccessKey: "..." };
    case "SMTP":
      return { host: "smtp.example.com", port: 587, user: "user", pass: "pass" };
    case "RESEND":
      return { apiKey: "re_..." };
    case "BIGQUERY":
      return { projectId: "my-project", clientEmail: "svc@...", privateKey: "-----BEGIN..." };
    default:
      return {};
  }
}

export default function ConnectorsPageClient({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [items, setItems] = useState<Connector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<ConnectorType>("POSTGRES");
  const [configJson, setConfigJson] = useState(
    JSON.stringify(defaultConfigFor("POSTGRES"), null, 2)
  );

  const listUrl = useMemo(
    () => `/connectors?workspaceId=${encodeURIComponent(workspaceId)}`,
    [workspaceId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Connector[]>("/connectors", {
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

  async function createConnector() {
    setError(null);
    try {
      const config = JSON.parse(configJson || "{}");
      await apiFetch<Connector>("/connectors", {
        method: "POST",
        body: JSON.stringify({ workspaceId, type, name, config }),
      });
      setName("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  async function testConnection() {
    setError(null);
    try {
      const config = JSON.parse(configJson || "{}");
      await apiFetch<{ ok: true }>("/connectors/test-connection", {
        method: "POST",
        body: JSON.stringify({ type, config }),
      });
      setError("✅ Connection ok");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  function onTypeChange(next: ConnectorType) {
    setType(next);
    setConfigJson(JSON.stringify(defaultConfigFor(next), null, 2));
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Connectors</h1>
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
        <h2 className="font-semibold mb-3">Create connector</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Name</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prod Postgres"
            />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Type</div>
            <select
              className="w-full border rounded px-3 py-2"
              value={type}
              onChange={(e) => onTypeChange(e.target.value as ConnectorType)}
            >
              <option value="POSTGRES">POSTGRES</option>
              <option value="SES">SES</option>
              <option value="SMTP">SMTP</option>
              <option value="RESEND">RESEND</option>
              <option value="BIGQUERY">BIGQUERY</option>
            </select>
          </label>
        </div>

        <label className="text-sm block mt-3">
          <div className="text-gray-600 mb-1">Config (JSON)</div>
          <textarea
            className="w-full border rounded px-3 py-2 font-mono text-xs h-44"
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
          />
          <div className="text-xs text-gray-500 mt-1">
            Note: stored config is encrypted and never returned by the API.
          </div>
        </label>

        <div className="mt-3 flex gap-3">
          <button
            className="px-4 py-2 rounded border text-sm disabled:opacity-50"
            onClick={testConnection}
            disabled={!configJson}
          >
            Test connection
          </button>
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
            onClick={createConnector}
            disabled={!name || !configJson}
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
          <Link
            className="px-4 py-2 rounded border text-sm"
            href={`/segments?workspaceId=${encodeURIComponent(workspaceId)}`}
          >
            Go to segments
          </Link>
        </div>

        {error ? (
          <div className="mt-3 text-sm text-red-600 whitespace-pre-wrap">
            {error}
          </div>
        ) : null}
      </div>

      <div className="bg-white border rounded">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">All connectors</h2>
          <span className="text-xs text-gray-500">
            {loading ? "Loading…" : `${items.length} items`}
          </span>
        </div>
        <div className="divide-y">
          {items.map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  <Link
                    className="text-indigo-700 hover:underline"
                    href={`/connectors/${c.id}?workspaceId=${encodeURIComponent(
                      workspaceId
                    )}`}
                  >
                    {c.name}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">{c.type}</div>
              </div>
              <div className="text-xs text-gray-500 font-mono">{c.id}</div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="px-4 py-10 text-sm text-gray-600">
              No connectors yet. Create a POSTGRES connector to use segments.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

