import SingleSendsPageClient from "./single-sends-page-client";

export default async function SingleSendsPage({
  searchParams,
}: {
  // Next.js 16: `searchParams` can be async (Promise) in server components.
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "ws_default";
  return <SingleSendsPageClient workspaceId={workspaceId} />;
}

