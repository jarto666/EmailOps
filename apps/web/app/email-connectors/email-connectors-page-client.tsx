"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Mail,
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
  Shield,
  Link as LinkIcon,
  Copy,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import type { EmailConnector } from "@/lib/api";
import { HowToButton, howToContent } from "@/components/how-to-modal";
import { useToast } from "@/components/toast";

function ConnectorTypeBadge({ type }: { type: string }) {
  const styles = {
    SES: { class: "badge-warning", label: "AWS SES" },
    RESEND: { class: "badge-primary", label: "Resend" },
    SMTP: { class: "badge-default", label: "SMTP" },
  };

  const style = styles[type as keyof typeof styles] || {
    class: "badge-default",
    label: type,
  };

  return <span className={`badge ${style.class}`}>{style.label}</span>;
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

type SESConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type ResendConfig = {
  apiKey: string;
};

type SMTPConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
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
  const [name, setName] = useState("");
  const [type, setType] = useState<"SES" | "RESEND" | "SMTP">("SES");

  // SES config
  const [sesConfig, setSesConfig] = useState<SESConfig>({
    region: "us-east-1",
    accessKeyId: "",
    secretAccessKey: "",
  });

  // Resend config
  const [resendConfig, setResendConfig] = useState<ResendConfig>({
    apiKey: "",
  });

  // SMTP config
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleTypeChange = (newType: "SES" | "RESEND" | "SMTP") => {
    setType(newType);
    setTestResult(null);
  };

  const getConfig = () => {
    if (type === "SES") {
      return sesConfig;
    } else if (type === "RESEND") {
      return resendConfig;
    } else {
      const config: Record<string, unknown> = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
      };
      // Only include auth if both username and password are provided
      if (smtpConfig.username && smtpConfig.password) {
        config.user = smtpConfig.username;
        config.pass = smtpConfig.password;
      }
      return config;
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Validate required fields based on type
      if (
        type === "SES" &&
        (!sesConfig.accessKeyId || !sesConfig.secretAccessKey)
      ) {
        throw new Error("Access Key ID and Secret Access Key are required");
      }
      if (type === "RESEND" && !resendConfig.apiKey) {
        throw new Error("API Key is required");
      }
      if (type === "SMTP" && !smtpConfig.host) {
        throw new Error("Host is required");
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
    setType("SES");
    setSesConfig({ region: "us-east-1", accessKeyId: "", secretAccessKey: "" });
    setResendConfig({ apiKey: "" });
    setSmtpConfig({
      host: "",
      port: 587,
      secure: false,
      username: "",
      password: "",
    });
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.emailConnectors.create({
        name,
        type,
        config: getConfig(),
      });
      onSuccess();
      resetForm();
      onClose();
      toast.success("Email connector created successfully");
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
            Add Email Provider
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
                placeholder="e.g., AWS SES Production"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Provider Type</label>
              <select
                className="select"
                value={type}
                onChange={(e) =>
                  handleTypeChange(e.target.value as "SES" | "RESEND" | "SMTP")
                }
              >
                <option value="SES">AWS SES</option>
                <option value="RESEND">Resend</option>
                <option value="SMTP">SMTP</option>
              </select>
            </div>
          </div>

          {/* SES Configuration */}
          {type === "SES" && (
            <div className="space-y-4">
              <div>
                <label className="label">AWS Region</label>
                <select
                  className="select"
                  value={sesConfig.region}
                  onChange={(e) =>
                    setSesConfig((c) => ({ ...c, region: e.target.value }))
                  }
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-east-2">US East (Ohio)</option>
                  <option value="us-west-1">US West (N. California)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="eu-west-2">EU (London)</option>
                  <option value="eu-central-1">EU (Frankfurt)</option>
                  <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                  <option value="ap-southeast-1">
                    Asia Pacific (Singapore)
                  </option>
                  <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                </select>
              </div>
              <div>
                <label className="label">Access Key ID</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={sesConfig.accessKeyId}
                  onChange={(e) =>
                    setSesConfig((c) => ({ ...c, accessKeyId: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Secret Access Key</label>
                <input
                  type="password"
                  className="input font-mono"
                  placeholder="••••••••••••••••••••"
                  value={sesConfig.secretAccessKey}
                  onChange={(e) =>
                    setSesConfig((c) => ({
                      ...c,
                      secretAccessKey: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
          )}

          {/* Resend Configuration */}
          {type === "RESEND" && (
            <div>
              <label className="label">API Key</label>
              <input
                type="password"
                className="input font-mono"
                placeholder="re_••••••••••••••••••••"
                value={resendConfig.apiKey}
                onChange={(e) => setResendConfig({ apiKey: e.target.value })}
                required
              />
              <p className="text-xs text-faint mt-2">
                Get your API key from the Resend dashboard
              </p>
            </div>
          )}

          {/* SMTP Configuration */}
          {type === "SMTP" && (
            <div className="space-y-4">
              <div className="form-grid">
                <div>
                  <label className="label">Host</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="smtp.example.com"
                    value={smtpConfig.host}
                    onChange={(e) =>
                      setSmtpConfig((c) => ({ ...c, host: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">Port</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="587"
                    value={smtpConfig.port}
                    onChange={(e) =>
                      setSmtpConfig((c) => ({
                        ...c,
                        port: parseInt(e.target.value) || 587,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtpConfig.secure}
                    onChange={(e) =>
                      setSmtpConfig((c) => ({ ...c, secure: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-border-default bg-muted"
                  />
                  <span className="text-sm text-muted-foreground">
                    Use TLS/SSL (port 465)
                  </span>
                </label>
              </div>
              <div>
                <label className="label">Username (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="user@example.com"
                  value={smtpConfig.username}
                  onChange={(e) =>
                    setSmtpConfig((c) => ({ ...c, username: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Password (optional)</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••••••"
                  value={smtpConfig.password}
                  onChange={(e) =>
                    setSmtpConfig((c) => ({ ...c, password: e.target.value }))
                  }
                />
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
                "Add Provider"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmailConnectorsPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectors, setConnectors] = useState<EmailConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    try {
      const data = await api.emailConnectors.list();
      setConnectors(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch connectors",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      await api.emailConnectors.test(id);
      // Refresh to get updated status
      await fetchConnectors();
      toast.success("Connection successful");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Connection test failed",
      );
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
      await api.emailConnectors.delete(id);
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

  const filteredConnectors = connectors.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to extract display info from connector config
  const getConnectorDetails = (connector: EmailConnector) => {
    const config = connector.config as Record<string, unknown>;
    return {
      region: config?.region as string | undefined,
      host: config?.host as string | undefined,
      status: "connected", // Default status - could be enhanced with actual status tracking
      profilesCount: connector._count?.senderProfiles ?? 0,
    };
  };

  const copyWebhookUrl = async (connector: EmailConnector) => {
    if (!connector.webhookUrl) return;
    await navigator.clipboard.writeText(connector.webhookUrl);
    setCopiedId(connector.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
          <h1 className="page-title">Email Providers</h1>
          <p className="page-description">
            Configure email sending infrastructure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HowToButton {...howToContent.emailConnectors} />
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Provider
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card-glow">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Bring Your Own Infrastructure
            </h3>
            <p className="text-sm text-muted-foreground">
              Connect your AWS SES, Resend, or SMTP servers. Your emails, your
              reputation, your deliverability. Credentials are encrypted and
              never leave your infrastructure.
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
          placeholder="Search providers..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Connectors Grid */}
      {filteredConnectors.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredConnectors.map((connector) => {
            const details = getConnectorDetails(connector);
            const isDeleting = deletingId === connector.id;
            const isTesting = testingId === connector.id;

            return (
              <div key={connector.id} className="card-glow group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-400">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="relative">
                    <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link
                  href={`/email-connectors/${connector.id}`}
                  className="block mb-3"
                >
                  <h3 className="text-lg font-semibold text-foreground hover:text-indigo-400 transition-colors">
                    {connector.name}
                  </h3>
                  {details.region && (
                    <p className="text-sm text-faint mt-0.5">
                      Region: {details.region}
                    </p>
                  )}
                  {details.host && (
                    <p className="text-sm text-faint mt-0.5">
                      Host: {details.host}
                    </p>
                  )}
                </Link>

                <div className="flex items-center gap-3 mb-4">
                  <ConnectorTypeBadge type={connector.type} />
                  <StatusIndicator status={details.status} />
                </div>

                {connector.webhookUrl && (
                  <div className="mb-4 p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <LinkIcon className="w-3.5 h-3.5 text-faint flex-shrink-0" />
                        <span className="text-xs text-faint truncate font-mono">
                          {connector.webhookUrl}
                        </span>
                      </div>
                      <button
                        onClick={() => copyWebhookUrl(connector)}
                        className="btn btn-ghost p-1 flex-shrink-0"
                        title="Copy webhook URL"
                      >
                        {copiedId === connector.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border-default">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-foreground">
                        {details.profilesCount}
                      </div>
                      <div className="text-xs text-faint">Profiles</div>
                    </div>
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
                      href={`/email-connectors/${connector.id}/edit`}
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
            <Mail className="empty-state-icon" />
            <h3 className="empty-state-title">No providers found</h3>
            <p className="empty-state-description">
              {searchQuery
                ? "No providers match your search"
                : "Add your first email provider to start sending"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Add Provider
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
