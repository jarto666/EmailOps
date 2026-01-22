/**
 * Email Connectors resource
 */
import type { HttpClient } from '../http';
import type { EmailConnector, CreateEmailConnectorInput } from '../types';

export class EmailConnectorsResource {
  constructor(private http: HttpClient) {}

  /**
   * List all email connectors
   */
  async list(): Promise<EmailConnector[]> {
    return this.http.get<EmailConnector[]>('/email-connectors');
  }

  /**
   * Get an email connector by ID
   */
  async get(id: string): Promise<EmailConnector> {
    return this.http.get<EmailConnector>(`/email-connectors/${id}`);
  }

  /**
   * Create a new email connector
   */
  async create(input: CreateEmailConnectorInput): Promise<EmailConnector> {
    return this.http.post<EmailConnector>('/email-connectors', input);
  }

  /**
   * Update an email connector
   */
  async update(id: string, input: Partial<CreateEmailConnectorInput>): Promise<EmailConnector> {
    return this.http.patch<EmailConnector>(`/email-connectors/${id}`, input);
  }

  /**
   * Delete an email connector
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/email-connectors/${id}`);
  }

  /**
   * Test connection to the email provider
   */
  async testConnection(id: string): Promise<{ ok: boolean; message?: string }> {
    return this.http.post<{ ok: boolean; message?: string }>(`/email-connectors/${id}/test`);
  }
}
