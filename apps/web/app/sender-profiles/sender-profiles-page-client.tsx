"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCircle,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Mail,
  AtSign,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { SenderProfile, EmailConnector } from "@/lib/api";
import { HowToButton, howToContent } from "@/components/how-to-modal";
import { useToast } from "@/components/toast";

function CreateProfileModal({
  isOpen,
  onClose,
  connectors,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  connectors: EmailConnector[];
  onSubmit: (data: {
    fromEmail: string;
    fromName: string;
    replyTo?: string;
    emailProviderConnectorId: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    fromEmail: "",
    fromName: "",
    replyTo: "",
    emailProviderConnectorId: "",
  });

  useEffect(() => {
    if (isOpen && connectors.length > 0 && !formData.emailProviderConnectorId) {
      setFormData((prev) => ({
        ...prev,
        emailProviderConnectorId: connectors[0].id,
      }));
    }
  }, [isOpen, connectors, formData.emailProviderConnectorId]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        fromEmail: "",
        fromName: "",
        replyTo: "",
        emailProviderConnectorId: connectors[0]?.id || "",
      });
    }
  }, [isOpen, connectors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.fromEmail ||
      !formData.fromName ||
      !formData.emailProviderConnectorId
    ) {
      // toast.error('Please fill in all required fields');
      return;
    }

    try {
      await onSubmit({
        fromEmail: formData.fromEmail,
        fromName: formData.fromName,
        replyTo: formData.replyTo || undefined,
        emailProviderConnectorId: formData.emailProviderConnectorId,
      });
    } catch (err) {
      // toast.error(err instanceof Error ? err.message : 'Failed to create profile');
      // Note: The parent component handles the actual submission and toast, but here we might want to show validation errors?
      // Actually, onSubmit is passed from parent. Let's see how parent handles it.
      // Parent wraps it in try/catch but doesn't throw? Wait.
      // handleCreateProfile in parent sets state and calls api.
      // If api fails, it throws.
      // So here we should catch and show toast.
      throw err; // Let parent handle or handle here?
      // The parent `handleCreateProfile` doesn't seem to catch errors from `onSubmit` call inside `CreateProfileModal`?
      // No, `CreateProfileModal` calls `onSubmit`.
      // Let's look at `handleCreateProfile` in parent.
      // It has try/finally. It does NOT catch errors!
      // So the error propagates to here.
      // So we should toast here.
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-secondary border border-border-default rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Create Sender Profile
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost p-2"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Email Provider</label>
            <select
              className="select"
              value={formData.emailProviderConnectorId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  emailProviderConnectorId: e.target.value,
                }))
              }
              disabled={isSubmitting}
            >
              {connectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">From Email</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
              <input
                type="email"
                className="input input-with-icon"
                placeholder="news@yourdomain.com"
                value={formData.fromEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    fromEmail: e.target.value,
                  }))
                }
                disabled={isSubmitting}
                required
              />
            </div>
            <p className="text-xs text-faint mt-1">
              Must be verified with your email provider
            </p>
          </div>

          <div>
            <label className="label">From Name</label>
            <input
              type="text"
              className="input"
              placeholder="Your Company"
              value={formData.fromName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fromName: e.target.value }))
              }
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label className="label">Reply-To (Optional)</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
              <input
                type="email"
                className="input input-with-icon"
                placeholder="support@yourdomain.com"
                value={formData.replyTo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, replyTo: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
                "Create Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SenderProfilesPageClient() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<SenderProfile[]>([]);
  const [emailConnectors, setEmailConnectors] = useState<EmailConnector[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [profilesData, connectorsData] = await Promise.all([
        api.senderProfiles.list(),
        api.emailConnectors.list(),
      ]);
      setProfiles(profilesData);
      setEmailConnectors(connectorsData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProfile = async (data: {
    fromEmail: string;
    fromName: string;
    replyTo?: string;
    emailProviderConnectorId: string;
  }) => {
    setIsSubmitting(true);
    try {
      const newProfile = await api.senderProfiles.create(data);
      setProfiles((prev) => [...prev, newProfile]);
      setIsModalOpen(false);
      toast.success("Sender profile created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create profile",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sender profile?")) {
      return;
    }

    setDeletingId(id);
    try {
      await api.senderProfiles.delete(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast.success("Sender profile deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete profile",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.fromEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fromName?.toLowerCase().includes(searchQuery.toLowerCase()),
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
          <h1 className="page-title">Sender Profiles</h1>
          <p className="page-description">
            Configure sender identities for your campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HowToButton {...howToContent.senderProfiles} />
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Profile
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card-glow">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <UserCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Sender Identity
            </h3>
            <p className="text-sm text-muted-foreground">
              Each profile defines a sender identity (from address, name,
              reply-to) linked to an email provider. Use different profiles for
              newsletters, transactional emails, and alerts.
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
          placeholder="Search profiles..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Profiles Grid */}
      {filteredProfiles.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredProfiles.map((profile) => (
            <div key={profile.id} className="card-glow group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div className="relative">
                  <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link
                href={`/sender-profiles/${profile.id}`}
                className="block mb-3"
              >
                <h3 className="text-lg font-semibold text-foreground hover:text-indigo-400 transition-colors">
                  {profile.fromName || profile.fromEmail}
                </h3>
                <p className="text-sm text-faint font-mono mt-1">
                  {profile.fromEmail}
                </p>
              </Link>

              {profile.replyTo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <MessageSquare className="w-4 h-4" />
                  <span>Reply to: {profile.replyTo}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span className="badge badge-default">
                  <Mail className="w-3 h-3 mr-1" />
                  {profile.emailProviderConnector?.name || "No connector"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border-default">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">
                      {profile._count?.singleSends ?? 0}
                    </div>
                    <div className="text-xs text-faint">Campaigns</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/sender-profiles/${profile.id}/edit`}
                    className="btn btn-ghost p-2"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    className="btn btn-ghost p-2 text-rose-400"
                    onClick={() => handleDeleteProfile(profile.id)}
                    disabled={deletingId === profile.id}
                  >
                    {deletingId === profile.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <UserCircle className="empty-state-icon" />
            <h3 className="empty-state-title">No profiles found</h3>
            <p className="empty-state-description">
              {searchQuery
                ? "No profiles match your search"
                : "Create your first sender profile to start sending"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Create Profile
              </button>
            )}
          </div>
        </div>
      )}

      <CreateProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        connectors={emailConnectors}
        onSubmit={handleCreateProfile}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
