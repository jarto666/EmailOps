import DataConnectorEditor from "./data-connector-editor";

export default async function DataConnectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "ws_default";
  return <DataConnectorEditor dataConnectorId={p.id} workspaceId={workspaceId} />;
}

