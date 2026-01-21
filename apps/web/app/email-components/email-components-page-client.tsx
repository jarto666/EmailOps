"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Eye,
  Copy,
  Code,
  Palette,
  Type,
  Image,
  Square,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Component } from "@/lib/api";
import { useToast } from "@/components/toast";

function ComponentTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    HEADER: { class: "badge-primary", icon: Type },
    FOOTER: { class: "badge-default", icon: Square },
    BUTTON: { class: "badge-success", icon: Square },
    CARD: { class: "badge-warning", icon: Layers },
    DIVIDER: { class: "badge-default", icon: Square },
    SNIPPET: { class: "badge-primary", icon: Code },
  };

  const style = styles[type] || { class: "badge-default", icon: Layers };
  const Icon = style.icon;

  return (
    <span className={`badge ${style.class}`}>
      <Icon className="w-3 h-3 mr-1" />
      {type}
    </span>
  );
}

const defaultMjmlContent = `<mj-section>
  <mj-column>
    <mj-text>
      Your component content here
    </mj-text>
  </mj-column>
</mj-section>`;

function CreateComponentModal({
  isOpen,
  onClose,
  onComponentCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onComponentCreated: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Component["type"]>("HEADER");
  const [contentType, setContentType] =
    useState<Component["contentType"]>("MJML");
  const [content, setContent] = useState(defaultMjmlContent);
  const [variables, setVariables] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("HEADER");
    setContentType("MJML");
    setContent(defaultMjmlContent);
    setVariables("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const variablesArray = variables
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .map((v) => ({ name: v, type: "string" }));

      await api.components.create({
        name,
        description,
        type,
        contentType,
        content,
        variables: variablesArray,
      });

      resetForm();
      onComponentCreated();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create component",
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
      <div className="relative bg-secondary border border-border-default rounded-2xl w-full max-w-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Create Component
          </h2>
          <button onClick={handleClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-grid">
            <div>
              <label className="label">Component Name</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="brand-header"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-faint mt-1">
                Unique identifier for this component
              </p>
            </div>
            <div>
              <label className="label">Description</label>
              <input
                type="text"
                className="input"
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="label">Type</label>
              <select
                className="select"
                value={type}
                onChange={(e) => setType(e.target.value as Component["type"])}
              >
                <option value="HEADER">Header</option>
                <option value="FOOTER">Footer</option>
                <option value="BUTTON">Button</option>
                <option value="CARD">Card</option>
                <option value="DIVIDER">Divider</option>
                <option value="SNIPPET">Snippet</option>
              </select>
            </div>
            <div>
              <label className="label">Content Type</label>
              <select
                className="select"
                value={contentType}
                onChange={(e) =>
                  setContentType(e.target.value as Component["contentType"])
                }
              >
                <option value="MJML">MJML</option>
                <option value="HTML">HTML</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Variables (comma-separated)</label>
            <input
              type="text"
              className="input font-mono"
              placeholder="logoUrl, companyName, primaryColor"
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
            />
            <p className="text-xs text-faint mt-1">
              Define variables that can be customized when using this component
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{contentType} Content</label>
              <div className="flex items-center gap-2 text-xs text-faint">
                <Code className="w-4 h-4" />
                {contentType}
              </div>
            </div>
            <textarea
              className="textarea font-mono text-sm h-48"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              required
            />
            <p className="text-xs text-faint mt-1">
              Use {"{{variableName}}"} syntax for dynamic values
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
              {isSubmitting ? "Creating..." : "Create Component"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmailComponentsPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  const fetchComponents = async () => {
    try {
      const data = await api.components.list();
      setComponents(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch components",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this component?")) return;

    setDeletingId(id);
    try {
      await api.components.delete(id);
      setComponents((prev) => prev.filter((c) => c.id !== id));
      toast.success("Component deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete component",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleComponentCreated = () => {
    fetchComponents();
  };

  const filteredComponents = components.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

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
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "256px", borderRadius: "16px" }}
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
          <h1 className="page-title">Components</h1>
          <p className="page-description">
            Reusable email building blocks for consistent branding
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Component
        </button>
      </div>

      {/* Info Card */}
      <div className="card-glow mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Component Library
            </h3>
            <p className="text-sm text-muted-foreground">
              Create reusable MJML/HTML components like headers, footers, and
              buttons. Use them across templates to maintain consistent branding
              and reduce duplication. Components support variables for
              customization.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="search-icon"
            style={{ width: "20px", height: "20px" }}
          />
          <input
            type="text"
            placeholder="Search components..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: "auto" }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="HEADER">Header</option>
          <option value="FOOTER">Footer</option>
          <option value="BUTTON">Button</option>
          <option value="CARD">Card</option>
          <option value="DIVIDER">Divider</option>
          <option value="SNIPPET">Snippet</option>
        </select>
      </div>

      {/* Components Grid */}
      {filteredComponents.length > 0 ? (
        <div className="cards-grid">
          {filteredComponents.map((component) => (
            <div key={component.id} className="card-glow group overflow-hidden">
              {/* Preview */}
              <div
                className="h-24 -mx-6 -mt-6 mb-4 overflow-hidden"
                dangerouslySetInnerHTML={{
                  __html: component.previewHtml || "",
                }}
              />

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground hover:text-indigo-400 transition-colors cursor-pointer">
                    {component.name}
                  </h3>
                  <p className="text-sm text-faint font-mono">
                    {component.type.toLowerCase()}
                  </p>
                </div>
                <div className="relative">
                  <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {component.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {component.description}
                </p>
              )}

              <div className="flex items-center gap-2 mb-3">
                <ComponentTypeBadge type={component.type} />
                <span className="badge badge-default">
                  <Code className="w-3 h-3 mr-1" />
                  {component.contentType}
                </span>
              </div>

              {component.variables && component.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {component.variables.map((v) => (
                    <span
                      key={v.name}
                      className="text-xs bg-muted text-faint px-2 py-0.5 rounded font-mono"
                    >
                      {"{{"}
                      {v.name}
                      {"}}"}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border-default">
                <div className="text-sm text-faint">
                  {new Date(component.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn btn-ghost p-2">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    className="btn btn-ghost p-2 text-rose-400"
                    onClick={() => handleDelete(component.id)}
                    disabled={deletingId === component.id}
                  >
                    <Trash2
                      className={`w-4 h-4 ${deletingId === component.id ? "animate-pulse" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Layers className="empty-state-icon" />
            <h3 className="empty-state-title">No components found</h3>
            <p className="empty-state-description">
              {searchQuery || typeFilter !== "all"
                ? "No components match your filters"
                : "Create your first component to start building your library"}
            </p>
            {!searchQuery && typeFilter === "all" && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Create Component
              </button>
            )}
          </div>
        </div>
      )}

      <CreateComponentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComponentCreated={handleComponentCreated}
      />
    </div>
  );
}
