import PublicWorkspaceCanvas from './PublicWorkspaceCanvas';

export async function generateStaticParams() {
  return [{ id: 'workspace' }];
}

export default function Page() {
  return <PublicWorkspaceCanvas />;
}
