import WorkspaceCanvas from './WorkspaceCanvas';

export async function generateStaticParams() {
  return [{ id: 'workspace' }];
}

export default function Page() {
  return <WorkspaceCanvas />;
}
