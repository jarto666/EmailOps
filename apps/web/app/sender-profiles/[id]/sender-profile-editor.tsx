"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

type SenderProfile = {
  id: string;
  emailProviderConnectorId: string;
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
};

export default function SenderProfileEditor({
  senderProfileId,
  workspaceId,
}: {
  senderProfileId: string;
  workspaceId: string;
}) {
  const [profile, setProfile] = useState<SenderProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  async function load() {
    setError(null);
    try {
      const p = await apiFetch<SenderProfile>(`/sender-profiles/${senderProfileId}`, {
        query: { workspaceId },
      });
      setProfile(p);
      setFromEmail(p.fromEmail);
      setFromName(p.fromName ?? "");
      setReplyTo(p.replyTo ?? "");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senderProfileId, workspaceId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch<SenderProfile>(`/sender-profiles/${senderProfileId}`, {
        method: "PATCH",
        query: { workspaceId },
        body: JSON.stringify({
          fromEmail,
          fromName: fromName || undefined,
          replyTo: replyTo || undefined,
        }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this sender profile?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/sender-profiles/${senderProfileId}`, {
        method: "DELETE",
        query: { workspaceId },
      });
      window.location.href = `/sender-profiles?workspaceId=${encodeURIComponent(
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
              href={`/sender-profiles?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              ← Sender profiles
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">
            {profile ? profile.fromEmail : "Sender profile"}
          </h1>
          <div className="text-xs text-gray-600 mt-1">
            id <span className="font-mono">{senderProfileId}</span> · email connector{" "}
            <span className="font-mono">
              {profile?.emailProviderConnectorId ?? "—"}
            </span>
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
            className="text-sm border rounded px-3 py-2 disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            Save
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
        </div>
      ) : null}

      <div className="bg-white border rounded">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Settings</h2>
        </div>
        <div className="p-4 space-y-4">
          <label className="text-sm block">
            <div className="text-gray-600 mb-1">From email</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </label>
          <label className="text-sm block">
            <div className="text-gray-600 mb-1">From name (optional)</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
          </label>
          <label className="text-sm block">
            <div className="text-gray-600 mb-1">Reply-to (optional)</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

