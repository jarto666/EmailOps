import JourneysPageClient from "./journeys-page-client";

export default async function JourneysPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "ws_default";
  return <JourneysPageClient workspaceId={workspaceId} />;
}

