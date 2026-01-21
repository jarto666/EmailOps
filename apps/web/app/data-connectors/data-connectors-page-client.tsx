"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Database,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plug,
  Server,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DataConnector } from "@/lib/api";
import { HowToButton, howToContent } from "@/components/how-to-modal";
import { useToast } from "@/components/toast";

function ConnectorTypeBadge({ type }: { type: string }) {
  const styles = {
    POSTGRES: { class: "badge-primary", icon: "🐘" },
    BIGQUERY: { class: "badge-warning", icon: "📊" },
  };

  const style = styles[type as keyof typeof styles] || {
    class: "badge-default",
    icon: "📁",
  };

  return (
    <span className={`badge ${style.class}`}>
      <span className="mr-1">{style.icon}</span>
      {type}
    </span>
  );
}

function StatusIndicator({
  status,
  error,
}: {
  status: string;
  error?: string;
}) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-2 text-emerald-400">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm">Connected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-rose-400">
      <div className="w-2 h-2 rounded-full bg-rose-400" />
      <span className="text-sm" title={error}>
        Error
      </span>
    </div>
  );
}

type PostgresConfig = {
  connectionString: string;
};

type BigQueryConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function CreateConnectorModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<"POSTGRES" | "BIGQUERY">("POSTGRES");

  // Postgres config
  const [postgresConfig, setPostgresConfig] = useState<PostgresConfig>({
    connectionString: "",
  });

  // BigQuery config
  const [bigqueryConfig, setBigqueryConfig] = useState<BigQueryConfig>({
    projectId: "",
    clientEmail: "",
    privateKey: "",
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleTypeChange = (newType: "POSTGRES" | "BIGQUERY") => {
    setType(newType);
    setTestResult(null);
  };

  const getConfig = () => {
    if (type === "POSTGRES") {
      return postgresConfig;
    } else {
      return {
        projectId: bigqueryConfig.projectId,
        credentials: {
          client_email: bigqueryConfig.clientEmail,
          private_key: bigqueryConfig.privateKey,
        },
      };
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      if (type === "POSTGRES" && !postgresConfig.connectionString) {
        throw new Error("Connection string is required");
      }
      if (
        type === "BIGQUERY" &&
        (!bigqueryConfig.projectId ||
          !bigqueryConfig.clientEmail ||
          !bigqueryConfig.privateKey)
      ) {
        throw new Error("All BigQuery fields are required");
      }
      setTestResult({ success: true });
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Validation failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setType("POSTGRES");
    setPostgresConfig({ connectionString: "" });
    setBigqueryConfig({ projectId: "", clientEmail: "", privateKey: "" });
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.dataConnectors.create({
        name,
        type,
        config: getConfig(),
      });
      toast.success("Connector created successfully");
      onSuccess();
      resetForm();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create connector",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-secondary border border-border-default rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Add Data Connector
          </h2>
          <button onClick={handleClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Production Database"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="select"
                value={type}
                onChange={(e) =>
                  handleTypeChange(e.target.value as "POSTGRES" | "BIGQUERY")
                }
              >
                <option value="POSTGRES">PostgreSQL</option>
                <option value="BIGQUERY">BigQuery</option>
              </select>
            </div>
          </div>

          {/* PostgreSQL Configuration */}
          {type === "POSTGRES" && (
            <div>
              <label className="label">Connection String</label>
              <input
                type="password"
                className="input font-mono"
                placeholder="postgresql://user:password@host:5432/database"
                value={postgresConfig.connectionString}
                onChange={(e) =>
                  setPostgresConfig({ connectionString: e.target.value })
                }
                required
              />
              <p className="text-xs text-faint mt-2">
                Format: postgresql://user:password@host:port/database
              </p>
            </div>
          )}

          {/* BigQuery Configuration */}
          {type === "BIGQUERY" && (
            <div className="space-y-4">
              <div>
                <label className="label">Project ID</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="your-project-id"
                  value={bigqueryConfig.projectId}
                  onChange={(e) =>
                    setBigqueryConfig((c) => ({
                      ...c,
                      projectId: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Service Account Email</label>
                <input
                  type="email"
                  className="input font-mono"
                  placeholder="service-account@project.iam.gserviceaccount.com"
                  value={bigqueryConfig.clientEmail}
                  onChange={(e) =>
                    setBigqueryConfig((c) => ({
                      ...c,
                      clientEmail: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Private Key</label>
                <textarea
                  className="textarea font-mono text-xs h-32"
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  value={bigqueryConfig.privateKey}
                  onChange={(e) =>
                    setBigqueryConfig((c) => ({
                      ...c,
                      privateKey: e.target.value,
                    }))
                  }
                  required
                />
                <p className="text-xs text-faint mt-2">
                  From your Google Cloud service account JSON key file
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-faint">
            Credentials are encrypted at rest and never exposed via API
          </p>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="btn btn-ghost text-sm"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plug className="w-4 h-4" />
              )}
              Test Connection
            </button>
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-3 p-3 rounded-lg ${
                testResult.success
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-rose-500/10 border border-rose-500/20"
              }`}
            >
              {testResult.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">
                    Configuration valid
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-rose-400">{testResult.error}</span>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Connector"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DataConnectorsPageClient() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    Record<string, { status: string; error?: string }>
  >({});

  const fetchConnectors = useCallback(async () => {
    try {
      const data = await api.dataConnectors.list();
      setConnectors(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch connectors",
      );
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      await api.dataConnectors.test(id);
      setConnectionStatus((prev) => ({
        ...prev,
        [id]: { status: "connected" },
      }));
      toast.success("Connection successful");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Connection failed";
      setConnectionStatus((prev) => ({
        ...prev,
        [id]: { status: "error", error: errorMsg },
      }));
      toast.error(errorMsg);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connector?")) {
      return;
    }

    setDeletingId(id);
    try {
      await api.dataConnectors.delete(id);
      setConnectors((prev) => prev.filter((c) => c.id !== id));
      toast.success("Connector deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete connector",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getConnectorStatus = (connector: DataConnector) => {
    if (connectionStatus[connector.id]) {
      return connectionStatus[connector.id];
    }
    // Default to connected for existing connectors
    return { status: "connected" };
  };

  const filteredConnectors = connectors.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div
            className="skeleton"
            style={{ height: "32px", width: "192px", marginBottom: "8px" }}
          />
          <div
            className="skeleton"
            style={{ height: "16px", width: "288px" }}
          />
        </div>
        <div className="cards-grid">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "192px", borderRadius: "16px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Data Connectors</h1>
          <p className="page-description">
            Connect to your databases for SQL-based segmentation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HowToButton {...howToContent.dataConnectors} />
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Connector
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card-glow">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Zero-ETL Architecture
            </h3>
            <p className="text-sm text-muted-foreground">
              Query your production or analytics databases directly. No data
              copying, no sync jobs, no stale data. Your segments always reflect
              real-time state.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search
          className="search-icon"
          style={{ width: "20px", height: "20px" }}
        />
        <input
          type="text"
          placeholder="Search connectors..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Connectors Grid */}
      {filteredConnectors.length > 0 ? (
        <div className="cards-grid">
          {filteredConnectors.map((connector) => {
            const status = getConnectorStatus(connector);
            const isTesting = testingId === connector.id;
            const isDeleting = deletingId === connector.id;

            return (
              <div key={connector.id} className="card-glow group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="relative">
                    <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link
                  href={`/data-connectors/${connector.id}`}
                  className="block mb-3"
                >
                  <h3 className="text-lg font-semibold text-foreground hover:text-indigo-400 transition-colors">
                    {connector.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-3 mb-4">
                  <ConnectorTypeBadge type={connector.type} />
                  <StatusIndicator
                    status={status.status}
                    error={status.error}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border-default">
                  <div className="text-sm text-faint">
                    {connector._count?.segments ?? 0} segments
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="btn btn-ghost p-2"
                      onClick={() => handleTestConnection(connector.id)}
                      disabled={isTesting}
                      title="Test connection"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`}
                      />
                    </button>
                    <Link
                      href={`/data-connectors/${connector.id}/edit`}
                      className="btn btn-ghost p-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      className="btn btn-ghost p-2 text-rose-400"
                      onClick={() => handleDelete(connector.id)}
                      disabled={isDeleting}
                      title="Delete connector"
                    >
                      {isDeleting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Database className="empty-state-icon" />
            <h3 className="empty-state-title">No connectors found</h3>
            <p className="empty-state-description">
              {searchQuery
                ? "No connectors match your search"
                : "Add your first data connector to start querying"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Add Connector
              </button>
            )}
          </div>
        </div>
      )}

      <CreateConnectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchConnectors}
      />
    </div>
  );
}
