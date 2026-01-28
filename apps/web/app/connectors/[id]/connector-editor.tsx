"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";

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
      return {
        projectId: "my-project",
        clientEmail: "svc@...",
        privateKey: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",
      };
    default:
      return {};
  }
}

export default function ConnectorEditor({
  connectorId,
  workspaceId,
}: {
  connectorId: string;
  workspaceId: string;
}) {
  const [connector, setConnector] = useState<Connector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<ConnectorType>("POSTGRES");
  const [configJson, setConfigJson] = useState<string>(
    JSON.stringify(defaultConfigFor("POSTGRES"), null, 2)
  );

  async function load() {
    setError(null);
    try {
      const c = await apiFetch<Connector>(`/connectors/${connectorId}`, {
        query: { workspaceId },
      });
      setConnector(c);
      setName(c.name);
      setType(c.type);
      // We can't show stored config (API redacts), so keep current editor contents.
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorId, workspaceId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let config: any | undefined = undefined;
      // If user has edited config JSON, include it; otherwise allow updating name/type only.
      if ((configJson || "").trim().length > 0) {
        config = JSON.parse(configJson);
      }
      await apiFetch<Connector>(`/connectors/${connectorId}`, {
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
      await apiFetch<{ ok: true }>("/connectors/test-connection", {
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
    if (!confirm("Delete this connector?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/connectors/${connectorId}`, {
        method: "DELETE",
        query: { workspaceId },
      });
      window.location.href = `/connectors?workspaceId=${encodeURIComponent(
        workspaceId
      )}`;
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function resetConfigTemplate() {
    setConfigJson(JSON.stringify(defaultConfigFor(type), null, 2));
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-600">
            <Link
              className="text-indigo-700 hover:underline"
              href={`/connectors?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              ← Connectors
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">
            {connector ? connector.name : "Connector"}
          </h1>
          <div className="text-xs text-gray-600 mt-1">
            Connector <span className="font-mono">{connectorId}</span> · workspace{" "}
            <span className="font-mono">{workspaceId}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="text-sm border rounded px-3 py-2 disabled:opacity-50"
            onClick={load}
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
              href={`/connectors?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              Back to connectors
            </Link>
          </div>
        </div>
      ) : null}

      <div className="bg-white border rounded">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Settings</h2>
          <div className="flex gap-2">
            <button
              className="text-sm border rounded px-3 py-2 disabled:opacity-50"
              onClick={testConnection}
              disabled={saving}
            >
              Test connection
            </button>
            <button
              className="text-sm bg-indigo-600 text-white rounded px-3 py-2 disabled:opacity-50"
              onClick={save}
              disabled={saving}
            >
              Save
            </button>
          </div>
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
              <div className="text-gray-600 mb-1">Type</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value as ConnectorType)}
              >
                <option value="POSTGRES">POSTGRES</option>
                <option value="SES">SES</option>
                <option value="SMTP">SMTP</option>
                <option value="RESEND">RESEND</option>
                <option value="BIGQUERY">BIGQUERY</option>
              </select>
            </label>
          </div>

          <label className="text-sm block">
            <div className="flex items-center justify-between mb-1">
              <div className="text-gray-600">Config (JSON)</div>
              <button
                className="text-sm border rounded px-3 py-1.5"
                type="button"
                onClick={resetConfigTemplate}
              >
                Insert template
              </button>
            </div>
            <textarea
              className="w-full border rounded px-3 py-2 font-mono text-xs h-56"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
            />
            <div className="text-xs text-gray-500 mt-1">
              Stored secrets are never returned by the API (you’ll need to paste config
              again to test/update).
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

