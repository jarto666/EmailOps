"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  X,
  Mail,
  User,
  Reply,
} from "lucide-react";
import { api } from "@/lib/api";
import type { SenderProfile } from "@/lib/api";
import { useToast } from "@/components/toast";

export default function SenderProfileEditor({
  senderProfileId,
}: {
  senderProfileId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<SenderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.senderProfiles.get(senderProfileId);
      setProfile(data);
      setName(data.name || "");
      setFromEmail(data.fromEmail);
      setFromName(data.fromName || "");
      setReplyTo(data.replyTo || "");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch sender profile",
      );
    } finally {
      setIsLoading(false);
    }
  }, [senderProfileId, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updated = await api.senderProfiles.update(senderProfileId, {
        name: name || undefined,
        fromEmail,
        fromName: fromName || undefined,
        replyTo: replyTo || undefined,
      });
      setProfile(updated);
      toast.success("Sender profile updated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update sender profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this sender profile? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.senderProfiles.delete(senderProfileId);
      router.push("/sender-profiles");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete sender profile",
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

  if (!profile) {
    return (
      <div className="card">
        <div className="empty-state">
          <AlertCircle className="empty-state-icon text-rose-400" />
          <h3 className="empty-state-title">Sender profile not found</h3>
          <p className="empty-state-description">
            The sender profile you&apos;re looking for doesn&apos;t exist or has
            been deleted.
          </p>
          <Link href="/sender-profiles" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Sender Profiles
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
          <Link href="/sender-profiles" className="btn btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-orange-400">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {profile.name || profile.fromEmail}
            </h1>
            <p className="text-sm text-faint">{profile.fromEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfile}
            className="btn btn-secondary"
            disabled={isSaving}
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
          <form onSubmit={handleSave} className="card-glow">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Sender Settings
            </h2>

            <div className="space-y-5">
              <div>
                <label className="label flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Marketing Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-faint mt-1">
                  Internal name to identify this sender profile.
                </p>
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  From Email
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder="hello@example.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  required
                  disabled={isSaving}
                />
                <p className="text-xs text-faint mt-1">
                  The email address that will appear in the From field.
                </p>
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <User className="w-4 h-4" />
                  From Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Your Company"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-faint mt-1">
                  The display name shown to recipients.
                </p>
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Reply className="w-4 h-4" />
                  Reply-To Email
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder="support@example.com"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-faint mt-1">
                  Where replies will be sent. Leave empty to use the From email.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border-default">
              <Link href="/sender-profiles" className="btn btn-secondary">
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
              Profile Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-faint">ID</span>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {profile.id}
                </p>
              </div>
              <div>
                <span className="text-xs text-faint">Email Connector</span>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {profile.emailProviderConnectorId}
                </p>
              </div>
              <div>
                <span className="text-xs text-faint">Created</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="card-glow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Email Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-faint w-16">From:</span>
                <span className="text-foreground">
                  {fromName ? `${fromName} <${fromEmail}>` : fromEmail}
                </span>
              </div>
              {replyTo && (
                <div className="flex items-start gap-2">
                  <span className="text-faint w-16">Reply-To:</span>
                  <span className="text-foreground">{replyTo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Help Card */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Sender Best Practices
                </h4>
                <p className="text-xs text-muted-foreground">
                  Use a verified domain for better deliverability. Make sure
                  your email provider has the domain configured and verified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
