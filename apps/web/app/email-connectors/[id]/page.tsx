import EmailConnectorEditor from "./email-connector-editor";

export default async function EmailConnectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "ws_default";
  return <EmailConnectorEditor emailConnectorId={p.id} workspaceId={workspaceId} />;
}

