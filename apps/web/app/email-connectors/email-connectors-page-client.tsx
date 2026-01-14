"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

type EmailConnectorType = "SES" | "RESEND" | "SMTP";

type EmailConnector = {
  id: string;
  name: string;
  type: EmailConnectorType;
  config?: any;
};

function defaultConfigFor(type: EmailConnectorType): any {
  switch (type) {
    case "SES":
      return { region: "us-east-1", accessKeyId: "AKIA...", secretAccessKey: "..." };
    case "RESEND":
      return { apiKey: "re_..." };
    case "SMTP":
      return { host: "smtp.example.com", port: 587, user: "user", pass: "pass" };
    default:
      return {};
  }
}

export default function EmailConnectorsPageClient({ workspaceId }: { workspaceId: string }) {
  const [items, setItems] = useState<EmailConnector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<EmailConnectorType>("SES");
  const [configJson, setConfigJson] = useState(
    JSON.stringify(defaultConfigFor("SES"), null, 2)
  );

  const listUrl = useMemo(
    () => `/email-connectors?workspaceId=${encodeURIComponent(workspaceId)}`,
    [workspaceId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<EmailConnector[]>("/email-connectors", {
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

  function onTypeChange(next: EmailConnectorType) {
    setType(next);
    setConfigJson(JSON.stringify(defaultConfigFor(next), null, 2));
  }

  async function testConnection() {
    setError(null);
    try {
      const config = JSON.parse(configJson || "{}");
      await apiFetch<{ ok: true }>("/email-connectors/test-connection", {
        method: "POST",
        body: JSON.stringify({ type, config }),
      });
      setError("✅ Connection ok");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  async function createConnector() {
    setError(null);
    try {
      const config = JSON.parse(configJson || "{}");
      await apiFetch<EmailConnector>("/email-connectors", {
        method: "POST",
        body: JSON.stringify({ workspaceId, type, name, config }),
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
          <h1 className="text-2xl font-bold">Email connectors</h1>
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
        <h2 className="font-semibold mb-3">Create email connector</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Name</div>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Type</div>
            <select className="w-full border rounded px-3 py-2" value={type} onChange={(e) => onTypeChange(e.target.value as EmailConnectorType)}>
              <option value="SES">SES</option>
              <option value="RESEND">RESEND</option>
              <option value="SMTP">SMTP</option>
            </select>
          </label>
        </div>

        <label className="text-sm block mt-3">
          <div className="text-gray-600 mb-1">Config (JSON)</div>
          <textarea className="w-full border rounded px-3 py-2 font-mono text-xs h-44" value={configJson} onChange={(e) => setConfigJson(e.target.value)} />
          <div className="text-xs text-gray-500 mt-1">Stored config is encrypted and never returned by the API.</div>
        </label>

        <div className="mt-3 flex gap-3">
          <button className="px-4 py-2 rounded border text-sm" onClick={testConnection} disabled={!configJson}>
            Test connection
          </button>
          <button className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50" onClick={createConnector} disabled={!name || !configJson}>
            Create
          </button>
          <button className="px-4 py-2 rounded border text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
          <Link className="px-4 py-2 rounded border text-sm" href={`/sender-profiles?workspaceId=${encodeURIComponent(workspaceId)}`}>
            Go to sender profiles
          </Link>
        </div>
        {error ? <div className="mt-3 text-sm text-red-600 whitespace-pre-wrap">{error}</div> : null}
      </div>

      <div className="bg-white border rounded">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">All email connectors</h2>
          <span className="text-xs text-gray-500">{loading ? "Loading…" : `${items.length} items`}</span>
        </div>
        <div className="divide-y">
          {items.map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  <Link className="text-indigo-700 hover:underline" href={`/email-connectors/${c.id}?workspaceId=${encodeURIComponent(workspaceId)}`}>
                    {c.name}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">{c.type}</div>
              </div>
              <div className="text-xs text-gray-500 font-mono">{c.id}</div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="px-4 py-10 text-sm text-gray-600">No email connectors yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

