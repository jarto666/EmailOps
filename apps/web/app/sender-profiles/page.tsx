import SenderProfilesPageClient from "./sender-profiles-page-client";

export default async function SenderProfilesPage({
  searchParams,
}: {
  // Next.js 16: `searchParams` can be async (Promise) in server components.
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "default";
  return <SenderProfilesPageClient workspaceId={workspaceId} />;
}

