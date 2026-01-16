import SingleSendEditor from "./single-send-editor";

export default async function SingleSendPage({
  params,
  searchParams,
}: {
  // Next.js 16: `params` can be async (Promise) in server components.
  params: Promise<{ id: string }> | { id: string };
  // Next.js 16: `searchParams` can be async (Promise) in server components.
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "ws_default";
  return <SingleSendEditor singleSendId={p.id} workspaceId={workspaceId} />;
}

