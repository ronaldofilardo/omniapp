import { auth } from '@/lib/auth';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const user = await auth();
  return <CalendarClient userId={user!.id} />;
}