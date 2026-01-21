"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Beaker,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Send,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DemoSend } from "@/lib/api";
import { useToast } from "@/components/toast";

function StatusBadge({ status }: { status: DemoSend["status"] }) {
  const config: Record<
    DemoSend["status"],
    { class: string; label: string; icon: typeof CheckCircle }
  > = {
    QUEUED: { class: "badge-default", label: "Queued", icon: Loader2 },
    SENT: { class: "badge-info", label: "Sent", icon: Send },
    DELIVERED: { class: "badge-success", label: "Delivered", icon: CheckCircle },
    BOUNCED: { class: "badge-danger", label: "Bounced", icon: XCircle },
    FAILED: { class: "badge-danger", label: "Failed", icon: XCircle },
    COMPLAINT: { class: "badge-warning", label: "Complaint", icon: AlertTriangle },
  };

  const { class: cls, label, icon: Icon } = config[status] || config.SENT;

  return (
    <span className={`badge ${cls}`}>
      <Icon className={`w-3 h-3 mr-1 ${status === "QUEUED" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

export default function DemoToolsPage() {
  const toast = useToast();
  const [demoEnabled, setDemoEnabled] = useState<boolean | null>(null);
  const [sends, setSends] = useState<DemoSend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [enabledResult, sendsResult] = await Promise.all([
        api.demo.isEnabled(),
        api.demo.listRecentSends(100).catch(() => []),
      ]);
      setDemoEnabled(enabledResult.enabled);
      if (enabledResult.enabled) {
        setSends(sendsResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check demo mode");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSimulateDelivery = async (send: DemoSend) => {
    setActionLoading(`deliver-${send.id}`);
    try {
      const result = await api.demo.simulateDelivery(send.id);
      toast.success(`Delivery simulated for ${send.email}`);
      setSends((prev) =>
        prev.map((s) =>
          s.id === send.id ? { ...s, status: result.newStatus as DemoSend["status"] } : s
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to simulate delivery");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateBounce = async (send: DemoSend, bounceType: "hard" | "soft") => {
    setActionLoading(`bounce-${send.id}`);
    try {
      const result = await api.demo.simulateBounce(send.id, bounceType);
      toast.success(
        `${bounceType === "hard" ? "Hard" : "Soft"} bounce simulated for ${send.email}${
          result.suppressionAdded ? " (added to suppression list)" : ""
        }`
      );
      setSends((prev) =>
        prev.map((s) =>
          s.id === send.id ? { ...s, status: result.newStatus as DemoSend["status"] } : s
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to simulate bounce");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateComplaint = async (send: DemoSend) => {
    setActionLoading(`complaint-${send.id}`);
    try {
      const result = await api.demo.simulateComplaint(send.id);
      toast.success(
        `Complaint simulated for ${send.email} (added to suppression list)`
      );
      setSends((prev) =>
        prev.map((s) =>
          s.id === send.id ? { ...s, status: result.newStatus as DemoSend["status"] } : s
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to simulate complaint");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ height: "32px", width: "192px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ height: "16px", width: "288px" }} />
        </div>
        <div className="skeleton" style={{ height: "400px", borderRadius: "16px" }} />
      </div>
    );
  }

  if (!demoEnabled) {
    return (
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Demo Tools</h1>
            <p className="text-muted-foreground">
              Simulate email events for testing and demonstrations
            </p>
          </div>
        </div>

        <div className="card">
          <div className="empty-state">
            <Beaker className="empty-state-icon" />
            <h3 className="empty-state-title">Demo Mode Not Enabled</h3>
            <p className="empty-state-description">
              To use demo tools, start the API server with <code className="font-mono bg-muted px-2 py-1 rounded">DEMO_MODE=true</code>
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left max-w-md">
              <p className="text-sm text-muted-foreground mb-2">Add to your .env file:</p>
              <code className="font-mono text-sm text-foreground">DEMO_MODE=true</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Demo Tools</h1>
          <p className="text-muted-foreground">
            Simulate email events for testing and demonstrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3313"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <ExternalLink className="w-4 h-4" />
            Open Mailpit
          </a>
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Beaker className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-400 font-medium">Demo Mode Active</p>
          <p className="text-sm text-blue-400/80 mt-1">
            Use the action buttons below to simulate delivery, bounce, or complaint events.
            Hard bounces and complaints will add the email to the suppression list.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-rose-400">{error}</span>
        </div>
      )}

      {/* Sends Table */}
      {sends.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Sent</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sends.map((send) => {
                const canSimulate = send.status === "SENT" || send.status === "DELIVERED";
                const isLoading = actionLoading?.includes(send.id);

                return (
                  <tr key={send.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-mono text-sm">{send.email}</span>
                          <div className="text-xs text-muted-foreground">
                            ID: {send.subjectId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm">{send.campaignName}</span>
                    </td>
                    <td>
                      <StatusBadge status={send.status} />
                    </td>
                    <td className="text-muted-foreground text-sm">
                      {new Date(send.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {canSimulate ? (
                          <>
                            <button
                              className="btn btn-ghost text-xs px-2 py-1 text-emerald-400 hover:bg-emerald-400/10"
                              onClick={() => handleSimulateDelivery(send)}
                              disabled={isLoading}
                              title="Simulate delivery"
                            >
                              {actionLoading === `deliver-${send.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              <span className="ml-1">Deliver</span>
                            </button>
                            <button
                              className="btn btn-ghost text-xs px-2 py-1 text-rose-400 hover:bg-rose-400/10"
                              onClick={() => handleSimulateBounce(send, "hard")}
                              disabled={isLoading}
                              title="Simulate hard bounce"
                            >
                              {actionLoading === `bounce-${send.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              <span className="ml-1">Bounce</span>
                            </button>
                            <button
                              className="btn btn-ghost text-xs px-2 py-1 text-amber-400 hover:bg-amber-400/10"
                              onClick={() => handleSimulateComplaint(send)}
                              disabled={isLoading}
                              title="Simulate complaint"
                            >
                              {actionLoading === `complaint-${send.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              <span className="ml-1">Complain</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {send.status === "QUEUED" ? "Pending..." : "Event simulated"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Send className="empty-state-icon" />
            <h3 className="empty-state-title">No sends yet</h3>
            <p className="empty-state-description">
              Send a campaign first, then come back here to simulate delivery events.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
