"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  MoreVertical,
  Shield,
  Clock,
  Send,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import type { CampaignGroup } from "@/lib/api";
import { HowToButton, howToContent } from "@/components/how-to-modal";

function formatWindow(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 24) return `${hours / 24}d`;
  return `${hours}h`;
}

function PolicyBadge({ policy }: { policy: string }) {
  const styles = {
    HIGHEST_PRIORITY_WINS: { class: "badge-primary", label: "Priority" },
    FIRST_QUEUED_WINS: { class: "badge-warning", label: "First Queued" },
    SEND_ALL: { class: "badge-default", label: "No Collision" },
  };

  const style = styles[policy as keyof typeof styles] || styles.SEND_ALL;

  return (
    <span className={`badge ${style.class}`}>
      <Shield className="w-3 h-3 mr-1" />
      {style.label}
    </span>
  );
}

function CreateGroupModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [collisionPolicy, setCollisionPolicy] = useState<
    CampaignGroup["collisionPolicy"]
  >("HIGHEST_PRIORITY_WINS");
  const [collisionWindow, setCollisionWindow] = useState(86400);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCollisionPolicy("HIGHEST_PRIORITY_WINS");
    setCollisionWindow(86400);
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
      await api.campaignGroups.create({
        name,
        description: description || undefined,
        collisionPolicy,
        collisionWindow,
      });
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
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
      <div className="relative bg-secondary border border-border-default rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Create Campaign Group
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
            <label className="label">Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Activation Emails"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              placeholder="What types of campaigns belong in this group?"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Collision Policy</label>
              <select
                className="select"
                value={collisionPolicy}
                onChange={(e) =>
                  setCollisionPolicy(
                    e.target.value as CampaignGroup["collisionPolicy"],
                  )
                }
                disabled={isSubmitting}
              >
                <option value="HIGHEST_PRIORITY_WINS">
                  Highest Priority Wins
                </option>
                <option value="FIRST_QUEUED_WINS">First Queued Wins</option>
                <option value="SEND_ALL">No Collision Check</option>
              </select>
            </div>
            <div>
              <label className="label">Collision Window</label>
              <select
                className="select"
                value={collisionWindow}
                onChange={(e) => setCollisionWindow(parseInt(e.target.value))}
                disabled={isSubmitting}
              >
                <option value="21600">6 hours</option>
                <option value="43200">12 hours</option>
                <option value="86400">24 hours</option>
                <option value="172800">48 hours</option>
                <option value="604800">7 days</option>
              </select>
            </div>
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
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignGroupsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groups, setGroups] = useState<CampaignGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setError(null);
      const data = await api.campaignGroups.list();
      setGroups(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch campaign groups",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign group?")) {
      return;
    }

    setDeletingId(id);
    try {
      await api.campaignGroups.delete(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setDeletingId(null);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Campaign Groups
          </h1>
          <p className="text-muted-foreground">
            Group related campaigns to prevent email fatigue with collision
            detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HowToButton {...howToContent.campaignGroups} />
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Group
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

      {/* Info Card */}
      <div className="card-glow mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">
              How Collision Detection Works
            </h3>
            <p className="text-sm text-muted-foreground">
              When multiple campaigns in the same group target the same user,
              the collision policy determines which email gets sent. With
              "Highest Priority Wins", only the highest priority campaign sends
              within the collision window.
            </p>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const isDeleting = deletingId === group.id;
            return (
              <div key={group.id} className="card-glow group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <div className="relative">
                    <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link
                  href={`/campaign-groups/${group.id}`}
                  className="block mb-3"
                >
                  <h3 className="text-lg font-semibold text-foreground hover:text-indigo-400 transition-colors">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </Link>

                <div className="flex items-center gap-3 mb-4">
                  <PolicyBadge policy={group.collisionPolicy} />
                  <span className="badge badge-default">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatWindow(group.collisionWindow)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border-default">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-foreground">
                        {group._count?.singleSends ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Campaigns
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/campaign-groups/${group.id}/edit`}
                      className="btn btn-ghost p-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      className="btn btn-ghost p-2 text-rose-400"
                      onClick={() => handleDelete(group.id)}
                      disabled={isDeleting}
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
            <FolderKanban className="empty-state-icon" />
            <h3 className="empty-state-title">No campaign groups</h3>
            <p className="empty-state-description">
              Create your first campaign group to start organizing campaigns and
              prevent email fatigue
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          </div>
        </div>
      )}

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchGroups}
      />
    </div>
  );
}
