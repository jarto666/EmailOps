export type CreateSegmentDto = {
  workspaceId: string;
  name: string;
  connectorId: string;
  sqlQuery: string;
};

export type UpdateSegmentDto = Partial<Pick<CreateSegmentDto, "name" | "connectorId" | "sqlQuery">>;

export type DryRunSegmentDto = {
  limit?: number;
};

