/**
 * Templates resource
 */
import type { HttpClient } from '../http';
import type {
  Template,
  CreateTemplateInput,
  CreateTemplateVersionInput,
  TemplateVersion,
} from '../types';

export class TemplatesResource {
  constructor(private http: HttpClient) {}

  /**
   * List all templates
   */
  async list(): Promise<Template[]> {
    return this.http.get<Template[]>('/templates');
  }

  /**
   * Get a template by ID
   */
  async get(id: string): Promise<Template> {
    return this.http.get<Template>(`/templates/${id}`);
  }

  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput): Promise<Template> {
    return this.http.post<Template>('/templates', input);
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/templates/${id}`);
  }

  /**
   * Create a new version for a template
   */
  async createVersion(templateId: string, input: CreateTemplateVersionInput): Promise<TemplateVersion> {
    return this.http.post<TemplateVersion>(`/templates/${templateId}/versions`, input);
  }

  /**
   * Set a version as active
   */
  async activateVersion(templateId: string, versionId: string): Promise<TemplateVersion> {
    return this.http.post<TemplateVersion>(`/templates/${templateId}/versions/${versionId}/activate`);
  }

  /**
   * Preview a template with sample data
   */
  async preview(templateId: string, vars?: Record<string, unknown>): Promise<{ subject: string; html: string }> {
    return this.http.post<{ subject: string; html: string }>(`/templates/${templateId}/preview`, { vars });
  }
}
