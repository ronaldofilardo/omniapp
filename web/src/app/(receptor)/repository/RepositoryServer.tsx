import { auth } from '@/lib/auth';
import RepositoryClient from './RepositoryClient';

export default async function RepositoryServer() {
  const user = await auth();
  return <RepositoryClient userId={user!.id} />;
}
