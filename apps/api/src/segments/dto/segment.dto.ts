export type CreateSegmentDto = {
  workspaceId: string;
  name: string;
  dataConnectorId: string;
  sqlQuery: string;
};

export type UpdateSegmentDto = Partial<
  Pick<CreateSegmentDto, "name" | "dataConnectorId" | "sqlQuery">
>;

export type DryRunSegmentDto = {
  limit?: number;
};

