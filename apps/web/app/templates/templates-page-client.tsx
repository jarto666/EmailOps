'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  X,
  Eye,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Template } from '@/lib/api';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HowToButton, howToContent } from '@/components/how-to-modal';

function CategoryBadge({ category }: { category: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    MARKETING: 'default',
    TRANSACTIONAL: 'secondary',
    BOTH: 'outline',
  };

  return (
    <Badge variant={variants[category] || 'outline'}>
      {category}
    </Badge>
  );
}

function CreateTemplateModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'TRANSACTIONAL' | 'BOTH'>('MARKETING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setKey('');
    setName('');
    setCategory('MARKETING');
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
      await api.templates.create({ key, name, category });
      toast.success('Template created successfully');
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Template Key</Label>
            <Input
              className="font-mono"
              placeholder="welcome-email"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier used in API calls
            </p>
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Welcome Email"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as 'MARKETING' | 'TRANSACTIONAL' | 'BOTH')}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Affects unsubscribe handling and compliance
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Template'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  templateName,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  templateName: string;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle>Delete Template</DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-muted-foreground">
          Are you sure you want to delete <span className="font-semibold text-foreground">{templateName}</span>? This action cannot be undone.
        </p>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TemplatesPageClient() {
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; template: Template | null }>({
    isOpen: false,
    template: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await api.templates.list();
      setTemplates(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async () => {
    if (!deleteModal.template) return;

    setIsDeleting(true);
    try {
      await api.templates.delete(deleteModal.template.id);
      toast.success('Template deleted');
      setDeleteModal({ isOpen: false, template: null });
      await fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-48 rounded-lg" />
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
          <h1 className="text-3xl font-bold mb-2">Templates</h1>
          <p className="text-muted-foreground">
            Manage email templates with version control
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HowToButton {...howToContent.templates} />
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search templates..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="MARKETING">Marketing</SelectItem>
            <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
            <SelectItem value="BOTH">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group hover:border-primary/30 transition-all">
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={template.category} />
                    <div className="relative">
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Link href={`/templates/${template.id}`} className="block mb-3">
                  <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {template.key}
                  </p>
                </Link>

                {template.versions && template.versions.length > 0 && (
                  <div className="bg-secondary rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-muted-foreground">
                        Active: <span className="text-foreground">v{template.versions[0].version}</span>
                      </span>
                    </div>
                    {template.versions[0].subject && (
                      <p className="text-sm text-muted-foreground truncate">
                        {template.versions[0].subject}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      {template._count?.versions ?? template.versions?.length ?? 0} versions
                    </div>
                    {template.updatedAt && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {new Date(template.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/templates/${template.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/templates/${template.id}`}>
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteModal({ isOpen: true, template })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground max-w-xs mb-4">
                {searchQuery || categoryFilter !== 'all'
                  ? 'No templates match your filters'
                  : 'Create your first email template to get started'}
              </p>
              {!searchQuery && categoryFilter === 'all' && (
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create Template
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTemplates}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, template: null })}
        onConfirm={handleDelete}
        templateName={deleteModal.template?.name || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}
