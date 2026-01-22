/**
 * Data Connectors resource
 */
import type { HttpClient } from '../http';
import type { DataConnector, CreateDataConnectorInput } from '../types';

export class DataConnectorsResource {
  constructor(private http: HttpClient) {}

  /**
   * List all data connectors
   */
  async list(): Promise<DataConnector[]> {
    return this.http.get<DataConnector[]>('/data-connectors');
  }

  /**
   * Get a data connector by ID
   */
  async get(id: string): Promise<DataConnector> {
    return this.http.get<DataConnector>(`/data-connectors/${id}`);
  }

  /**
   * Create a new data connector
   */
  async create(input: CreateDataConnectorInput): Promise<DataConnector> {
    return this.http.post<DataConnector>('/data-connectors', input);
  }

  /**
   * Update a data connector
   */
  async update(id: string, input: Partial<CreateDataConnectorInput>): Promise<DataConnector> {
    return this.http.patch<DataConnector>(`/data-connectors/${id}`, input);
  }

  /**
   * Delete a data connector
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/data-connectors/${id}`);
  }

  /**
   * Test connection to the data source
   */
  async testConnection(id: string): Promise<{ ok: boolean; message?: string }> {
    return this.http.post<{ ok: boolean; message?: string }>(`/data-connectors/${id}/test`);
  }

  /**
   * Get database schema (tables and columns)
   */
  async getSchema(id: string): Promise<{ tables: Array<{ name: string; columns: string[] }> }> {
    return this.http.get<{ tables: Array<{ name: string; columns: string[] }> }>(`/data-connectors/${id}/schema`);
  }
}
