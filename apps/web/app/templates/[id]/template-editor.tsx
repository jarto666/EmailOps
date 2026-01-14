"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

type Template = {
  id: string;
  key: string;
  name: string;
  category: "MARKETING" | "TRANSACTIONAL" | "BOTH";
};

type TemplateVersion = {
  id: string;
  name: string;
  subject: string;
  mode: "RAW_HTML" | "RAW_MJML" | "UI_BUILDER";
  bodyHtml?: string | null;
  bodyMjml?: string | null;
  builderSchema?: any;
  active: boolean;
  createdAt: string;
};

export default function TemplateEditor({
  templateId,
  workspaceId,
}: {
  templateId: string;
  workspaceId: string;
}) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) || null,
    [versions, selectedVersionId]
  );

  // Editor state
  const [mode, setMode] = useState<TemplateVersion["mode"]>("RAW_HTML");
  const [versionName, setVersionName] = useState("v1");
  const [subject, setSubject] = useState("Hello {{user.firstName}}");
  const [bodyHtml, setBodyHtml] = useState("<h1>Hi {{user.firstName}}</h1>");
  const [bodyMjml, setBodyMjml] = useState(
    `<mjml>\n  <mj-body>\n    <mj-section>\n      <mj-column>\n        <mj-text>Hello {{user.firstName}}</mj-text>\n      </mj-column>\n    </mj-section>\n  </mj-body>\n</mjml>\n`
  );
  const [builderSchema, setBuilderSchema] = useState(
    JSON.stringify(
      { blocks: [{ type: "text", text: "Hello {{user.firstName}}" }] },
      null,
      2
    )
  );

  const [variables, setVariables] = useState(
    JSON.stringify({ user: { firstName: "Ava" } }, null, 2)
  );
  const [previewHtml, setPreviewHtml] = useState<string>("");

  async function loadAll() {
    setError(null);
    try {
      const t = await apiFetch<any>(`/templates/${templateId}`, {
        query: { workspaceId },
      });
      setTemplate({ id: t.id, key: t.key, name: t.name, category: t.category });
      const vs: TemplateVersion[] = Array.isArray(t.versions) ? t.versions : [];
      setVersions(vs);
      const active = vs.find((v) => v.active) || vs[0] || null;
      setSelectedVersionId(active ? active.id : null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, workspaceId]);

  // When selecting a version, load its fields into editor.
  useEffect(() => {
    if (!selected) return;
    setMode(selected.mode);
    setVersionName(selected.name);
    setSubject(selected.subject);
    setBodyHtml(selected.bodyHtml || "");
    setBodyMjml(selected.bodyMjml || "");
    setBuilderSchema(
      JSON.stringify(selected.builderSchema ?? { blocks: [] }, null, 2)
    );
    setPreviewHtml(selected.bodyHtml || "");
  }, [selected?.id]); // intentional

  async function createVersion() {
    setSaving(true);
    setError(null);
    try {
      const payload: any = { name: versionName, subject, mode };
      if (mode === "RAW_HTML") payload.bodyHtml = bodyHtml;
      if (mode === "RAW_MJML") payload.bodyMjml = bodyMjml;
      if (mode === "UI_BUILDER") payload.builderSchema = JSON.parse(builderSchema);

      const v = await apiFetch<TemplateVersion>(
        `/templates/${templateId}/versions`,
        {
          method: "POST",
          query: { workspaceId },
          body: JSON.stringify(payload),
        }
      );
      await loadAll();
      setSelectedVersionId(v.id);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveVersion() {
    if (!selectedVersionId) return;
    setSaving(true);
    setError(null);
    try {
      const payload: any = { name: versionName, subject, mode };
      if (mode === "RAW_HTML") payload.bodyHtml = bodyHtml;
      if (mode === "RAW_MJML") payload.bodyMjml = bodyMjml;
      if (mode === "UI_BUILDER") payload.builderSchema = JSON.parse(builderSchema);

      await apiFetch<TemplateVersion>(
        `/templates/${templateId}/versions/${selectedVersionId}`,
        {
          method: "PATCH",
          query: { workspaceId },
          body: JSON.stringify(payload),
        }
      );
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!selectedVersionId) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(
        `/templates/${templateId}/versions/${selectedVersionId}/publish`,
        { method: "POST", query: { workspaceId }, body: JSON.stringify({}) }
      );
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function renderPreview() {
    if (!selectedVersionId) return;
    setSaving(true);
    setError(null);
    try {
      const vars = JSON.parse(variables || "{}");
      const out = await apiFetch<{ subject: string; html: string }>(
        `/templates/${templateId}/versions/${selectedVersionId}/render`,
        {
          method: "POST",
          query: { workspaceId },
          body: JSON.stringify({ variables: vars }),
        }
      );
      setPreviewHtml(out.html);
      setSubject(out.subject); // optional: show rendered subject
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
              href={`/templates?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              ← Templates
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">
            {template ? template.name : "Template"}
          </h1>
          <div className="text-xs text-gray-600 mt-1">
            <span className="font-mono">{template?.key ?? templateId}</span> ·{" "}
            {template?.category ?? "—"} · workspace{" "}
            <span className="font-mono">{workspaceId}</span>
          </div>
        </div>
        <button className="text-sm border rounded px-3 py-2" onClick={loadAll}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm whitespace-pre-wrap">
          {error}
          <div className="mt-2">
            <Link
              className="text-indigo-700 hover:underline"
              href={`/templates?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              Back to templates
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Versions</h2>
            <span className="text-xs text-gray-500">{versions.length}</span>
          </div>
          <div className="divide-y">
            {versions.map((v) => (
              <button
                key={v.id}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                  v.id === selectedVersionId ? "bg-indigo-50" : ""
                }`}
                onClick={() => setSelectedVersionId(v.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {v.name}{" "}
                    {v.active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded ml-2">
                        active
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-500">{v.mode}</div>
                </div>
                <div className="text-xs text-gray-600 mt-1 truncate">
                  {v.subject}
                </div>
              </button>
            ))}
            {versions.length === 0 ? (
              <div className="px-4 py-8 text-sm text-gray-600">
                No versions yet. Create one on the right.
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-white border rounded lg:col-span-2">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Editor</h2>
            <div className="flex gap-2">
              <button
                className="text-sm border rounded px-3 py-2 disabled:opacity-50"
                onClick={selectedVersionId ? saveVersion : createVersion}
                disabled={saving}
              >
                {selectedVersionId ? "Save" : "Create version"}
              </button>
              <button
                className="text-sm bg-indigo-600 text-white rounded px-3 py-2 disabled:opacity-50"
                onClick={publish}
                disabled={!selectedVersionId || saving}
              >
                Publish
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-sm">
                <div className="text-gray-600 mb-1">Version name</div>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                />
              </label>
              <label className="text-sm md:col-span-2">
                <div className="text-gray-600 mb-1">Subject</div>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
            </div>

            <div className="flex gap-2 text-sm">
              {(["RAW_HTML", "RAW_MJML", "UI_BUILDER"] as const).map((m) => (
                <button
                  key={m}
                  className={`px-3 py-2 rounded border ${
                    mode === m ? "bg-indigo-50 border-indigo-300" : ""
                  }`}
                  onClick={() => setMode(m)}
                  type="button"
                >
                  {m === "RAW_HTML"
                    ? "Raw HTML"
                    : m === "RAW_MJML"
                      ? "Raw MJML"
                      : "UI Builder"}
                </button>
              ))}
            </div>

            {mode === "RAW_HTML" ? (
              <label className="text-sm block">
                <div className="text-gray-600 mb-1">HTML</div>
                <textarea
                  className="w-full border rounded px-3 py-2 font-mono text-xs h-56"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                />
              </label>
            ) : null}

            {mode === "RAW_MJML" ? (
              <label className="text-sm block">
                <div className="text-gray-600 mb-1">MJML</div>
                <textarea
                  className="w-full border rounded px-3 py-2 font-mono text-xs h-56"
                  value={bodyMjml}
                  onChange={(e) => setBodyMjml(e.target.value)}
                />
              </label>
            ) : null}

            {mode === "UI_BUILDER" ? (
              <label className="text-sm block">
                <div className="text-gray-600 mb-1">Builder schema (JSON)</div>
                <textarea
                  className="w-full border rounded px-3 py-2 font-mono text-xs h-56"
                  value={builderSchema}
                  onChange={(e) => setBuilderSchema(e.target.value)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Minimal schema: {"{ blocks: [{type:'text'|'button'|'divider', ...}] }"}
                </div>
              </label>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-gray-600">Variables (JSON)</div>
                  <button
                    className="text-sm border rounded px-3 py-1.5 disabled:opacity-50"
                    onClick={renderPreview}
                    disabled={!selectedVersionId || saving}
                  >
                    Render preview
                  </button>
                </div>
                <textarea
                  className="w-full border rounded px-3 py-2 font-mono text-xs h-40"
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                />
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Live preview</div>
                <div className="border rounded overflow-hidden bg-white">
                  <iframe
                    title="preview"
                    className="w-full h-40"
                    srcDoc={previewHtml || "<div></div>"}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Uses API `/render` (MJML compile + variable interpolation).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

