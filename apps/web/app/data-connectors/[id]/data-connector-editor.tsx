"use client";

import { useEffect, useState, useCallback } from "react";
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
  Plug,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DataConnector } from "@/lib/api";
import { useToast } from "@/components/toast";
import SecretField from "@/components/SecretField";

// Config field definitions for each connector type
interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
  required?: boolean;
  fullWidth?: boolean;
}

const configFieldsByType: Record<string, ConfigField[]> = {
  POSTGRES: [
    {
      key: "connectionString",
      label: "Connection String",
      type: "password",
      placeholder: "postgresql://user:pass@host:5432/db",
      required: true,
      fullWidth: true,
    },
  ],
  BIGQUERY: [
    {
      key: "projectId",
      label: "Project ID",
      type: "text",
      placeholder: "my-gcp-project",
      required: true,
    },
    {
      key: "credentials.client_email",
      label: "Client Email",
      type: "text",
      placeholder: "service-account@project.iam.gserviceaccount.com",
      required: true,
      fullWidth: true,
    },
    {
      key: "credentials.private_key",
      label: "Private Key",
      type: "password",
      placeholder: "-----BEGIN RSA PRIVATE KEY-----...",
      required: true,
      fullWidth: true,
    },
  ],
};

// Helper to get a nested value from an object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let value: unknown = obj;
  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return "";
    }
  }
  return value !== undefined && value !== null ? String(value) : "";
}

// Helper to set a nested value in an object using dot notation
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: string,
): Record<string, unknown> {
  const keys = path.split(".");
  const result = { ...obj };

  if (keys.length === 1) {
    result[keys[0]] = value;
    return result;
  }

  // Handle nested paths
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    } else {
      current[key] = { ...(current[key] as Record<string, unknown>) };
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return result;
}

export default function DataConnectorEditor({
  dataConnectorId,
}: {
  dataConnectorId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [connector, setConnector] = useState<DataConnector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<DataConnector["type"]>("POSTGRES");
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  const fetchConnector = useCallback(async () => {
    try {
      // Fetch with config to populate non-secret fields (projectId, etc.)
      const data = await api.dataConnectors.get(dataConnectorId, true);
      setConnector(data);
      setName(data.name);
      setType(data.type);

      // Populate non-secret config values from the fetched config
      if (data.config && !("redacted" in data.config)) {
        const fields = configFieldsByType[data.type] || [];
        const values: Record<string, string> = {};
        for (const field of fields) {
          // Only auto-populate non-secret fields
          if (field.type !== "password") {
            const val = getNestedValue(
              data.config as Record<string, unknown>,
              field.key,
            );
            if (val) {
              values[field.key] = val;
            }
          }
        }
        setConfigValues((prev) => ({ ...prev, ...values }));
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch data connector",
      );
    } finally {
      setIsLoading(false);
    }
  }, [dataConnectorId, toast]);

  useEffect(() => {
    fetchConnector();
  }, [fetchConnector]);

  // Per-field credential reveal
  const handleRevealField = useCallback(
    async (fieldKey: string): Promise<string | null> => {
      try {
        const result = await api.dataConnectors.getConfigField(
          dataConnectorId,
          fieldKey,
        );
        return result.value;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : `Failed to reveal ${fieldKey}`,
        );
        return null;
      }
    },
    [dataConnectorId, toast],
  );

  const handleConfigChange = (key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Build config object from form values
      const fields = configFieldsByType[type] || [];
      let config: Record<string, unknown> = {};

      for (const field of fields) {
        const value = configValues[field.key];
        if (value !== undefined && value !== "") {
          config = setNestedValue(config, field.key, value);
        }
      }

      const updated = await api.dataConnectors.update(dataConnectorId, {
        name,
        type,
        config: Object.keys(config).length > 0 ? config : undefined,
      });
      setConnector(updated);
      toast.success("Data connector updated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update data connector",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);

    try {
      // Build config object from form values
      const fields = configFieldsByType[type] || [];
      let config: Record<string, unknown> = {};

      for (const field of fields) {
        const value = configValues[field.key];
        if (value !== undefined && value !== "") {
          config = setNestedValue(config, field.key, value);
        }
      }

      await api.dataConnectors.testConnection({ type, config });
      toast.success("Connection successful!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Connection test failed",
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this data connector? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.dataConnectors.delete(dataConnectorId);
      toast.success("Data connector deleted");
      router.push("/data-connectors");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete data connector",
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
          style={{ height: "400px", borderRadius: "16px" }}
        />
      </div>
    );
  }

  if (!connector) {
    return (
      <div className="card">
        <div className="empty-state">
          <AlertCircle className="empty-state-icon text-rose-400" />
          <h3 className="empty-state-title">Data connector not found</h3>
          <p className="empty-state-description">
            The data connector you&apos;re looking for doesn&apos;t exist or has
            been deleted.
          </p>
          <Link href="/data-connectors" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Connectors
          </Link>
        </div>
      </div>
    );
  }

  const fields = configFieldsByType[type] || [];

  return (
    <div className="animate-slide-up flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/data-connectors" className="btn btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {connector.name}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {connector.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConnector}
            className="btn btn-secondary"
            disabled={isSaving || isTesting}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleTestConnection}
            className="btn btn-secondary"
            disabled={isSaving || isTesting}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plug className="w-4 h-4" />
            )}
            Test
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
          <form onSubmit={handleSave} className="card-glow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Connection Settings
              </h2>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Production Database"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    className="select"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as DataConnector["type"]);
                      setConfigValues({});
                    }}
                    disabled={isSaving}
                  >
                    <option value="POSTGRES">PostgreSQL</option>
                    <option value="BIGQUERY">BigQuery</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-border-default pt-5">
                <h3 className="text-sm font-medium text-foreground mb-4">
                  {type === "POSTGRES" ? "PostgreSQL" : "BigQuery"}{" "}
                  Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) =>
                    field.type === "password" ? (
                      <SecretField
                        key={field.key}
                        label={field.label}
                        fieldKey={field.key}
                        value={configValues[field.key] || ""}
                        placeholder={field.placeholder}
                        required={field.required}
                        disabled={isSaving}
                        fullWidth={field.fullWidth}
                        hasStoredValue={!!connector?.id}
                        onReveal={handleRevealField}
                        onChange={(value) =>
                          handleConfigChange(field.key, value)
                        }
                      />
                    ) : (
                      <div
                        key={field.key}
                        className={field.fullWidth ? "md:col-span-2" : ""}
                      >
                        <label className="label">
                          {field.label}
                          {field.required && (
                            <span className="text-rose-400 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          className="input font-mono"
                          placeholder={field.placeholder}
                          value={configValues[field.key] || ""}
                          onChange={(e) =>
                            handleConfigChange(field.key, e.target.value)
                          }
                          required={field.required}
                          disabled={isSaving}
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Click the eye icon on each secret field to reveal its stored
                value, or enter new values to update.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border-default">
              <Link href="/data-connectors" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="card-glow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Connection Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">ID</span>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {connector.id}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Type</span>
                <p className="text-sm text-foreground">
                  {connector.type === "POSTGRES" ? "PostgreSQL" : "BigQuery"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(connector.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Configuration Help
                </h4>
                <p className="text-xs text-muted-foreground">
                  {type === "POSTGRES" ? (
                    <>
                      Use a connection string format:{" "}
                      <code className="text-emerald-400">
                        postgresql://user:pass@host:5432/db
                      </code>
                    </>
                  ) : (
                    <>
                      Provide your GCP project ID, service account email, and
                      private key from your service account JSON.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Self-Hosted
                </h4>
                <p className="text-xs text-muted-foreground">
                  Credentials are encrypted at rest. You can view stored values
                  since this is a self-hosted instance. Use read-only database
                  credentials for added safety.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
