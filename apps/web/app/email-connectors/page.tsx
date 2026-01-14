import EmailConnectorsPageClient from "./email-connectors-page-client";

export default async function EmailConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }> | { workspaceId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const workspaceId = sp.workspaceId || "default";
  return <EmailConnectorsPageClient workspaceId={workspaceId} />;
}

