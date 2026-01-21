import SegmentEditor from "./segment-editor";

export default async function SegmentPage({
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
  return <SegmentEditor segmentId={p.id} workspaceId={workspaceId} />;
}

