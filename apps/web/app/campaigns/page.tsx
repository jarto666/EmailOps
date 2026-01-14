import CampaignsPageClient from "./campaigns-page-client";

export default async function CampaignsPage({
  searchParams,
}: {
  // Next.js 16: `searchParams` can be async (Promise) in server components.
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "default";
  return <CampaignsPageClient workspaceId={workspaceId} />;
}

