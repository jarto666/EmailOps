"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Database,
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Play,
  X,
  Users,
  Code,
  Table,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Segment, DataConnector, DryRunResult } from "@/lib/api";
import { useToast } from "@/components/toast";

export default function SegmentEditor({
  segmentId,
}: {
  segmentId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [dataConnectorId, setDataConnectorId] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  // Preview state
  const [preview, setPreview] = useState<DryRunResult | null>(null);
  const [previewLimit, setPreviewLimit] = useState(25);

  const columns = useMemo(() => {
    const row = preview?.rows?.[0];
    if (!row || typeof row !== "object") return [];
    return Object.keys(row).slice(0, 12);
  }, [preview?.rows]);

  const fetchData = useCallback(async () => {
    try {
      const [seg, cons] = await Promise.all([
        api.segments.get(segmentId),
        api.dataConnectors.list(),
      ]);
      setSegment(seg);
      setConnectors(cons);
      setName(seg.name);
      setDataConnectorId(seg.dataConnectorId);
      setSqlQuery(seg.sqlQuery);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch segment",
      );
    } finally {
      setIsLoading(false);
    }
  }, [segmentId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const updated = await api.segments.update(segmentId, {
        name,
        dataConnectorId,
        sqlQuery,
      });
      setSegment(updated);
      toast.success("Segment saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save segment",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunPreview = async () => {
    setIsRunning(true);

    try {
      // Save first to use latest query
      await api.segments.update(segmentId, {
        name,
        dataConnectorId,
        sqlQuery,
      });

      const result = await api.segments.dryRun(segmentId, previewLimit);
      setPreview(result);
      toast.success(`Preview complete: ${result.count} recipients found`);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run preview");
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this segment? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.segments.delete(segmentId);
      toast.success("Segment deleted");
      router.push("/segments");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete segment",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div
            className="skeleton"
            style={{ height: "40px", width: "40px", borderRadius: "8px" }}
          />
          <div>
            <div
              className="skeleton"
              style={{ height: "28px", width: "200px", marginBottom: "8px" }}
            />
            <div
              className="skeleton"
              style={{ height: "16px", width: "300px" }}
            />
          </div>
        </div>
        <div
          className="skeleton"
          style={{ height: "500px", borderRadius: "16px" }}
        />
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="card">
        <div className="empty-state">
          <AlertCircle className="empty-state-icon text-rose-400" />
          <h3 className="empty-state-title">Segment not found</h3>
          <p className="empty-state-description">
            The segment you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Link href="/segments" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Segments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/segments" className="btn btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {segment.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {segment.dataConnector?.name || "No connector"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="btn btn-secondary"
            disabled={isSaving || isRunning}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-secondary text-rose-400 hover:bg-rose-500/10"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="card-glow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Segment Definition
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="btn btn-secondary"
                  disabled={isSaving || isRunning}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </button>
                <button
                  onClick={handleRunPreview}
                  className="btn btn-primary"
                  disabled={isSaving || isRunning}
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Run Preview
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Active Users Last 30 Days"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="label">Data Connector</label>
                  {connectors.length > 0 ? (
                    <select
                      className="select"
                      value={dataConnectorId}
                      onChange={(e) => setDataConnectorId(e.target.value)}
                      disabled={isSaving}
                    >
                      {connectors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="input font-mono text-sm"
                      value={dataConnectorId}
                      onChange={(e) => setDataConnectorId(e.target.value)}
                      placeholder="dataConnectorId"
                      disabled={isSaving}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  SQL Query
                </label>
                <textarea
                  className="textarea font-mono text-sm"
                  rows={12}
                  placeholder="SELECT user_id as recipient_id, email, json_build_object('name', name) as vars_json FROM users WHERE ..."
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Must return an ID column (
                  <code className="text-cyan-400">subject_id</code>,{" "}
                  <code className="text-cyan-400">recipient_id</code>, or{" "}
                  <code className="text-cyan-400">id</code>),{" "}
                  <code className="text-cyan-400">email</code>, and optionally{" "}
                  <code className="text-cyan-400">vars</code> (JSON for template
                  variables). Only SELECT/WITH queries allowed. Preview runs
                  with LIMIT and 5s timeout.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-6">
          <div className="card-glow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Table className="w-5 h-5" />
                Preview
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Limit</span>
                <input
                  type="number"
                  className="input w-20 text-sm"
                  min={1}
                  max={100}
                  value={previewLimit}
                  onChange={(e) =>
                    setPreviewLimit(parseInt(e.target.value || "25", 10))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Count */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                <span className="text-sm text-muted-foreground">
                  Total Count
                </span>
                <span className="text-lg font-semibold text-foreground font-mono">
                  {preview ? preview.count.toLocaleString() : "—"}
                </span>
              </div>

              {/* Validation Results */}
              {preview?.validation && (
                <div className="space-y-2">
                  {preview.validation.errors.length > 0 && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          {preview.validation.errors.map((err, i) => (
                            <p key={i} className="text-xs text-rose-400">
                              {err}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {preview.validation.warnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          {preview.validation.warnings.map((warn, i) => (
                            <p key={i} className="text-xs text-amber-400">
                              {warn}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {preview.validation.valid &&
                    preview.validation.warnings.length === 0 && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
                            <svg
                              className="w-2.5 h-2.5 text-background"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <p className="text-xs text-emerald-400">
                            Valid schema: {preview.validation.foundColumns.id}{" "}
                            (ID), {preview.validation.foundColumns.email}{" "}
                            (email)
                            {preview.validation.foundColumns.vars &&
                              `, ${preview.validation.foundColumns.vars} (vars)`}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Results Table */}
              {preview && preview.rows.length > 0 ? (
                <div className="border border-border-default rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-xs">
                      <thead className="bg-background border-b border-border-default sticky top-0">
                        <tr>
                          {columns.map((c) => (
                            <th
                              key={c}
                              className="text-left font-semibold px-3 py-2 text-muted-foreground whitespace-nowrap"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {preview.rows.slice(0, previewLimit).map((row, idx) => (
                          <tr key={idx} className="hover:bg-background/50">
                            {columns.map((c) => (
                              <td
                                key={c}
                                className="px-3 py-2 font-mono text-foreground"
                              >
                                {typeof row?.[c] === "object"
                                  ? JSON.stringify(row?.[c])
                                  : String(row?.[c] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : preview ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No rows returned.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Click{" "}
                  <span className="text-foreground font-medium">
                    Run Preview
                  </span>{" "}
                  to execute the query.
                </div>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Query Requirements
                </h4>
                <p className="text-xs text-muted-foreground">
                  Your query must return these columns:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-2">
                  <li>
                    <code className="text-cyan-400">subject_id</code> or{" "}
                    <code className="text-cyan-400">recipient_id</code> or{" "}
                    <code className="text-cyan-400">id</code>
                    <span className="block text-faint">
                      Unique user identifier
                    </span>
                  </li>
                  <li>
                    <code className="text-cyan-400">email</code>
                    <span className="block text-faint">Email address</span>
                  </li>
                  <li>
                    <code className="text-cyan-400">vars</code>{" "}
                    <span className="text-faint">(optional)</span>
                    <span className="block text-faint">
                      Template variables as JSON object
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
