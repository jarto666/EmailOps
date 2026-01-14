"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

type EmailConnector = { id: string; name: string; type: string };

type SenderProfile = {
  id: string;
  emailProviderConnectorId: string;
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
};

export default function SenderProfilesPageClient({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [items, setItems] = useState<SenderProfile[]>([]);
  const [connectors, setConnectors] = useState<EmailConnector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [emailProviderConnectorId, setEmailProviderConnectorId] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  const listUrl = useMemo(
    () => `/sender-profiles?workspaceId=${encodeURIComponent(workspaceId)}`,
    [workspaceId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [profilesData, connectorsData] = await Promise.all([
        apiFetch<SenderProfile[]>("/sender-profiles", { query: { workspaceId } }),
        apiFetch<EmailConnector[]>("/email-connectors", { query: { workspaceId } }),
      ]);
      setItems(profilesData);
      setConnectors(connectorsData);
      if (!emailProviderConnectorId && connectorsData[0]?.id)
        setEmailProviderConnectorId(connectorsData[0].id);
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

  async function createProfile() {
    setError(null);
    try {
      await apiFetch<SenderProfile>("/sender-profiles", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          emailProviderConnectorId,
          fromEmail,
          fromName: fromName || undefined,
          replyTo: replyTo || undefined,
        }),
      });
      setFromEmail("");
      setFromName("");
      setReplyTo("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sender profiles</h1>
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
          <h2 className="font-semibold">Create sender profile</h2>
          <Link
            className="text-sm text-indigo-700 hover:underline"
            href={`/campaigns?workspaceId=${encodeURIComponent(workspaceId)}`}
          >
            Back to campaigns
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Connector</div>
            {connectors.length > 0 ? (
              <select
                className="w-full border rounded px-3 py-2"
                value={emailProviderConnectorId}
                onChange={(e) => setEmailProviderConnectorId(e.target.value)}
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
                value={emailProviderConnectorId}
                onChange={(e) => setEmailProviderConnectorId(e.target.value)}
                placeholder="emailProviderConnectorId (create an email connector first)"
              />
            )}
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">From email</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="news@yourdomain.com"
            />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">From name (optional)</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your Company"
            />
          </label>
        </div>
        <label className="text-sm block mt-3">
          <div className="text-gray-600 mb-1">Reply-to (optional)</div>
          <input
            className="w-full border rounded px-3 py-2"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="support@yourdomain.com"
          />
        </label>

        <div className="mt-3 flex gap-3">
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
            onClick={createProfile}
            disabled={!emailProviderConnectorId || !fromEmail}
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
            href={`/email-connectors?workspaceId=${encodeURIComponent(workspaceId)}`}
          >
            Manage email connectors
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
          <h2 className="font-semibold">All sender profiles</h2>
          <span className="text-xs text-gray-500">
            {loading ? "Loading…" : `${items.length} items`}
          </span>
        </div>
        <div className="divide-y">
          {items.map((sp) => (
            <div key={sp.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  <Link
                    className="text-indigo-700 hover:underline"
                    href={`/sender-profiles/${sp.id}?workspaceId=${encodeURIComponent(
                      workspaceId
                    )}`}
                  >
                    {sp.fromEmail}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">
                  {sp.fromName ? `${sp.fromName} · ` : ""}
                  Email connector:{" "}
                  <span className="font-mono">{sp.emailProviderConnectorId}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-mono">{sp.id}</div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="px-4 py-10 text-sm text-gray-600">
              No sender profiles yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

