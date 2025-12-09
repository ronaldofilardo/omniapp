import { auth } from '@/lib/auth';
import NotificationCenter from '@/components/NotificationCenter';

export default async function NotificationsPage() {
  const user = await auth();
  return <NotificationCenter userId={user!.id} />;
}