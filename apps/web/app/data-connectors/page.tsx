import DataConnectorsPageClient from "./data-connectors-page-client";

export default async function DataConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "default";
  return <DataConnectorsPageClient workspaceId={workspaceId} />;
}

