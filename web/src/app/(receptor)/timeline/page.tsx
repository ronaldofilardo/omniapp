import { auth } from '@/lib/auth';
import TimelineClient from './TimelineClient';

export default async function TimelinePage() {
  const user = await auth();
  return <TimelineClient userId={user!.id} />;
}