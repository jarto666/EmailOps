"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Rocket,
  Play,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Code2,
  Blocks,
  X,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Template = {
  id: string;
  key: string;
  name: string;
  category: "MARKETING" | "TRANSACTIONAL" | "BOTH";
};

type TemplateVersion = {
  id: string;
  version: number;
  subject: string;
  preheader?: string | null;
  mode: "RAW_HTML" | "RAW_MJML" | "UI_BUILDER";
  bodyHtml?: string | null;
  bodyMjml?: string | null;
  builderSchema?: any;
  active: boolean;
  createdAt: string;
};

function CategoryBadge({ category }: { category: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    MARKETING: "default",
    TRANSACTIONAL: "secondary",
    BOTH: "outline",
  };

  return (
    <Badge variant={variants[category] || "default"}>
      {category}
    </Badge>
  );
}

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
  const [isLoading, setIsLoading] = useState(true);

  const selected = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) || null,
    [versions, selectedVersionId]
  );

  // Editor state
  const [mode, setMode] = useState<TemplateVersion["mode"]>("RAW_HTML");
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
      const payload: any = { subject, mode };
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
      const payload: any = { subject, mode };
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
      setSubject(out.subject);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeleton h-[400px] rounded-lg" />
          <div className="lg:col-span-2 skeleton h-[400px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            {template ? template.name : "Template"}
          </h1>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">
              {template?.key ?? templateId}
            </span>
            {template?.category && <CategoryBadge category={template.category} />}
          </div>
        </div>
        <Button variant="secondary" onClick={loadAll} disabled={saving}>
          <RefreshCw className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <span className="text-destructive flex-1">{error}</span>
          <Button variant="ghost" size="icon" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Versions Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Versions</CardTitle>
              <Badge variant="secondary">{versions.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {versions.map((v) => (
              <button
                key={v.id}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  v.id === selectedVersionId
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-secondary border border-transparent hover:border-border"
                }`}
                onClick={() => setSelectedVersionId(v.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">v{v.version}</span>
                    {v.active && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{v.mode}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{v.subject}</p>
              </button>
            ))}
            {versions.length === 0 && (
              <div className="text-center py-8">
                <FileCode className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No versions yet. Create one using the editor.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Editor</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={selectedVersionId ? saveVersion : createVersion}
                  disabled={saving}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {selectedVersionId ? "Save" : "Create Version"}
                </Button>
                <Button
                  onClick={publish}
                  disabled={!selectedVersionId || saving}
                >
                  <Rocket className="w-4 h-4" />
                  Publish
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Subject */}
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>

            {/* Mode Selector */}
            <div className="space-y-2">
              <Label>Content Mode</Label>
              <div className="flex gap-2">
                {(["RAW_HTML", "RAW_MJML", "UI_BUILDER"] as const).map((m) => (
                  <Button
                    key={m}
                    variant={mode === m ? "default" : "secondary"}
                    onClick={() => setMode(m)}
                    type="button"
                  >
                    {m === "RAW_HTML" && <Code2 className="w-4 h-4" />}
                    {m === "RAW_MJML" && <FileCode className="w-4 h-4" />}
                    {m === "UI_BUILDER" && <Blocks className="w-4 h-4" />}
                    {m === "RAW_HTML" ? "HTML" : m === "RAW_MJML" ? "MJML" : "Builder"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Content Editor */}
            {mode === "RAW_HTML" && (
              <div className="space-y-2">
                <Label>HTML Content</Label>
                <Textarea
                  className="h-56 font-mono"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="<html>...</html>"
                />
              </div>
            )}

            {mode === "RAW_MJML" && (
              <div className="space-y-2">
                <Label>MJML Content</Label>
                <Textarea
                  className="h-56 font-mono"
                  value={bodyMjml}
                  onChange={(e) => setBodyMjml(e.target.value)}
                  placeholder="<mjml>...</mjml>"
                />
              </div>
            )}

            {mode === "UI_BUILDER" && (
              <div className="space-y-2">
                <Label>Builder Schema (JSON)</Label>
                <Textarea
                  className="h-56 font-mono"
                  value={builderSchema}
                  onChange={(e) => setBuilderSchema(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Schema format: {"{ blocks: [{type:'text'|'button'|'divider', ...}] }"}
                </p>
              </div>
            )}

            {/* Preview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="mb-0">Test Variables (JSON)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={renderPreview}
                    disabled={!selectedVersionId || saving}
                  >
                    <Play className="w-4 h-4" />
                    Render
                  </Button>
                </div>
                <Textarea
                  className="h-40 font-mono"
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Live Preview</Label>
                <div className="rounded-lg overflow-hidden border border-border bg-white">
                  <iframe
                    title="preview"
                    className="w-full h-40"
                    srcDoc={previewHtml || "<div style='padding:20px;color:#666;'>Preview will appear here</div>"}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Uses /render API for MJML compilation + variable interpolation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
