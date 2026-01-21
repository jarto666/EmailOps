"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  ArrowLeft,
  Shield,
  Clock,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { CampaignGroup } from "@/lib/api";

function formatWindow(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 24) return `${hours / 24} days`;
  return `${hours} hours`;
}

function PolicyBadge({ policy }: { policy: string }) {
  const styles = {
    HIGHEST_PRIORITY_WINS: {
      class: "badge-primary",
      label: "Highest Priority Wins",
    },
    FIRST_QUEUED_WINS: { class: "badge-warning", label: "First Queued Wins" },
    SEND_ALL: { class: "badge-default", label: "No Collision Check" },
  };

  const style = styles[policy as keyof typeof styles] || styles.SEND_ALL;

  return (
    <span className={`badge ${style.class}`}>
      <Shield className="w-3 h-3 mr-1" />
      {style.label}
    </span>
  );
}

export default function CampaignGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [group, setGroup] = useState<CampaignGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [collisionPolicy, setCollisionPolicy] = useState<
    CampaignGroup["collisionPolicy"]
  >("HIGHEST_PRIORITY_WINS");
  const [collisionWindow, setCollisionWindow] = useState(86400);

  const fetchGroup = useCallback(async () => {
    try {
      setError(null);
      const data = await api.campaignGroups.get(id);
      setGroup(data);
      setName(data.name);
      setDescription(data.description || "");
      setCollisionPolicy(data.collisionPolicy);
      setCollisionWindow(data.collisionWindow);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch campaign group",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const updated = await api.campaignGroups.update(id, {
        name,
        description: description || undefined,
        collisionPolicy,
        collisionWindow,
      });
      setGroup(updated);
      setSuccessMessage("Campaign group updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update campaign group",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this campaign group? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.campaignGroups.delete(id);
      router.push("/campaign-groups");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete campaign group",
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

  if (!group) {
    return (
      <div className="card">
        <div className="empty-state">
          <AlertCircle className="empty-state-icon text-rose-400" />
          <h3 className="empty-state-title">Campaign group not found</h3>
          <p className="empty-state-description">
            The campaign group you&apos;re looking for doesn&apos;t exist or has
            been deleted.
          </p>
          <Link href="/campaign-groups" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
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
          <Link href="/campaign-groups" className="btn btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
            <p className="text-muted-foreground">
              Edit campaign group settings
            </p>
          </div>
        </div>
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

      {/* Messages */}
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

      {successMessage && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400">{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="card-glow">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Group Settings
            </h2>

            <div className="space-y-5">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Activation Emails"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  placeholder="What types of campaigns belong in this group?"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                />
              </div>

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
                  disabled={isSaving}
                >
                  <option value="HIGHEST_PRIORITY_WINS">
                    Highest Priority Wins
                  </option>
                  <option value="FIRST_QUEUED_WINS">First Queued Wins</option>
                  <option value="SEND_ALL">No Collision Check</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  {collisionPolicy === "HIGHEST_PRIORITY_WINS" &&
                    "Only the highest priority campaign will send to each user within the collision window."}
                  {collisionPolicy === "FIRST_QUEUED_WINS" &&
                    "The first campaign to queue a user wins. Later campaigns skip that user."}
                  {collisionPolicy === "SEND_ALL" &&
                    "No collision detection. All campaigns send independently."}
                </p>
              </div>

              <div>
                <label className="label">Collision Window</label>
                <select
                  className="select"
                  value={collisionWindow}
                  onChange={(e) => setCollisionWindow(parseInt(e.target.value))}
                  disabled={isSaving}
                >
                  <option value="21600">6 hours</option>
                  <option value="43200">12 hours</option>
                  <option value="86400">24 hours</option>
                  <option value="172800">48 hours</option>
                  <option value="604800">7 days</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Time period to check for previous sends when detecting
                  collisions.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border-default">
              <Link href="/campaign-groups" className="btn btn-secondary">
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
          {/* Stats Card */}
          <div className="card-glow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Overview
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Campaigns</span>
                <span className="text-foreground font-medium">
                  {group._count?.singleSends ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Policy</span>
                <PolicyBadge policy={group.collisionPolicy} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Window</span>
                <span className="badge badge-default">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatWindow(group.collisionWindow)}
                </span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Collision Detection
                </h4>
                <p className="text-xs text-muted-foreground">
                  Campaigns in this group share collision detection. When the
                  same user qualifies for multiple campaigns, the policy
                  determines which email sends.
                </p>
              </div>
            </div>
          </div>

          {/* Campaigns in Group */}
          {group._count?.singleSends && group._count.singleSends > 0 && (
            <div className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Campaigns in Group
              </h3>
              <Link
                href={`/campaigns?campaignGroupId=${group.id}`}
                className="btn btn-secondary w-full"
              >
                <Send className="w-4 h-4" />
                View {group._count.singleSends} Campaign
                {group._count.singleSends !== 1 ? "s" : ""}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
