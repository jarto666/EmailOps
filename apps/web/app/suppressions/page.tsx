"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Ban,
  Plus,
  Search,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Filter,
  Mail,
  AlertTriangle,
  MessageSquareWarning,
  UserMinus,
  Hand,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Suppression, SuppressionStats } from "@/lib/api";
import { HowToButton, howToContent } from "@/components/how-to-modal";

function ReasonBadge({ reason }: { reason: Suppression["reason"] }) {
  const config = {
    BOUNCE: { class: "badge-danger", label: "Bounce", icon: AlertTriangle },
    COMPLAINT: {
      class: "badge-warning",
      label: "Complaint",
      icon: MessageSquareWarning,
    },
    UNSUBSCRIBE: {
      class: "badge-default",
      label: "Unsubscribe",
      icon: UserMinus,
    },
    MANUAL: { class: "badge-secondary", label: "Manual", icon: Hand },
  };

  const { class: cls, label, icon: Icon } = config[reason] || config.MANUAL;

  return (
    <span className={`badge ${cls}`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </span>
  );
}

function AddSuppressionModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<Suppression["reason"]>("MANUAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setReason("MANUAL");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.suppressions.create({ email, reason });
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add suppression",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-secondary border border-border-default rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Add Suppression
          </h2>
          <button
            onClick={handleClose}
            className="btn btn-ghost p-2"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="label">Reason</label>
            <select
              className="select"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as Suppression["reason"])
              }
              disabled={isSubmitting}
            >
              <option value="MANUAL">Manual</option>
              <option value="BOUNCE">Bounce</option>
              <option value="COMPLAINT">Complaint</option>
              <option value="UNSUBSCRIBE">Unsubscribe</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Why is this email being suppressed?
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Suppression"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppressionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [stats, setStats] = useState<SuppressionStats | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<Suppression["reason"] | "">(
    "",
  );
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const fetchSuppressions = useCallback(async () => {
    try {
      setError(null);
      const [listResult, statsResult] = await Promise.all([
        api.suppressions.list({
          search: search || undefined,
          reason: reasonFilter || undefined,
          limit,
          offset,
        }),
        api.suppressions.getStats(),
      ]);
      setSuppressions(listResult.items);
      setTotal(listResult.total);
      setStats(statsResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch suppressions",
      );
    } finally {
      setIsLoading(false);
    }
  }, [search, reasonFilter, offset]);

  useEffect(() => {
    fetchSuppressions();
  }, [fetchSuppressions]);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this suppression? The email will be able to receive emails again.",
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await api.suppressions.delete(id);
      setSuppressions((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => prev - 1);
      // Refresh stats
      const statsResult = await api.suppressions.getStats();
      setStats(statsResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove suppression",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchSuppressions();
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

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
        <div
          className="skeleton"
          style={{ height: "400px", borderRadius: "16px" }}
        />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Suppressions
          </h1>
          <p className="text-muted-foreground">
            Manage email addresses that should not receive any emails
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HowToButton {...howToContent.suppressions} />
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Suppression
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-rose-400">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto btn btn-ghost p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-glow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.total}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Suppressed
                </div>
              </div>
            </div>
          </div>
          {stats.byReason.map((stat) => (
            <div key={stat.reason} className="card-glow p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  {stat.reason === "BOUNCE" && (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  )}
                  {stat.reason === "COMPLAINT" && (
                    <MessageSquareWarning className="w-5 h-5 text-amber-400" />
                  )}
                  {stat.reason === "UNSUBSCRIBE" && (
                    <UserMinus className="w-5 h-5 text-muted-foreground" />
                  )}
                  {stat.reason === "MANUAL" && (
                    <Hand className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {stat.count}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {stat.reason.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select w-40"
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value as Suppression["reason"] | "");
              setOffset(0);
            }}
          >
            <option value="">All Reasons</option>
            <option value="BOUNCE">Bounce</option>
            <option value="COMPLAINT">Complaint</option>
            <option value="UNSUBSCRIBE">Unsubscribe</option>
            <option value="MANUAL">Manual</option>
          </select>
          <button type="submit" className="btn btn-secondary">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </form>
      </div>

      {/* Suppressions Table */}
      {suppressions.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Reason</th>
                <th>Added</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {suppressions.map((suppression) => {
                const isDeleting = deletingId === suppression.id;
                return (
                  <tr key={suppression.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-sm">
                          {suppression.email}
                        </span>
                      </div>
                    </td>
                    <td>
                      <ReasonBadge reason={suppression.reason} />
                    </td>
                    <td className="text-muted-foreground">
                      {new Date(suppression.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost p-2 text-rose-400"
                        onClick={() => handleDelete(suppression.id)}
                        disabled={isDeleting}
                        title="Remove suppression"
                      >
                        {isDeleting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-default">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1} - {Math.min(offset + limit, total)} of{" "}
                {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Ban className="empty-state-icon" />
            <h3 className="empty-state-title">No suppressions</h3>
            <p className="empty-state-description">
              {search || reasonFilter
                ? "No suppressions match your filters. Try adjusting your search criteria."
                : "No email addresses are currently suppressed. Bounces and complaints will be added automatically."}
            </p>
            {!search && !reasonFilter && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Add Suppression
              </button>
            )}
          </div>
        </div>
      )}

      <AddSuppressionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSuppressions}
      />
    </div>
  );
}
