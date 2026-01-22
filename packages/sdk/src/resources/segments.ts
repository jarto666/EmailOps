/**
 * Segments resource
 */
import type { HttpClient } from '../http';
import type {
  Segment,
  CreateSegmentInput,
  UpdateSegmentInput,
  SegmentPreview,
} from '../types';

export class SegmentsResource {
  constructor(private http: HttpClient) {}

  /**
   * List all segments
   */
  async list(): Promise<Segment[]> {
    return this.http.get<Segment[]>('/segments');
  }

  /**
   * Get a segment by ID
   */
  async get(id: string): Promise<Segment> {
    return this.http.get<Segment>(`/segments/${id}`);
  }

  /**
   * Create a new segment
   */
  async create(input: CreateSegmentInput): Promise<Segment> {
    return this.http.post<Segment>('/segments', input);
  }

  /**
   * Update a segment
   */
  async update(id: string, input: UpdateSegmentInput): Promise<Segment> {
    return this.http.patch<Segment>(`/segments/${id}`, input);
  }

  /**
   * Delete a segment
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/segments/${id}`);
  }

  /**
   * Preview segment results (dry run the SQL query)
   */
  async preview(id: string, limit?: number): Promise<SegmentPreview> {
    return this.http.post<SegmentPreview>(`/segments/${id}/dry-run`, { limit });
  }

  /**
   * Preview a query without creating a segment
   */
  async previewQuery(dataConnectorId: string, sqlQuery: string, limit?: number): Promise<SegmentPreview> {
    return this.http.post<SegmentPreview>('/segments/preview', {
      dataConnectorId,
      sqlQuery,
      limit,
    });
  }
}
