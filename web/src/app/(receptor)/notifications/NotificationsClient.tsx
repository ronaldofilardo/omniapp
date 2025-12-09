'use client';

import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';

interface NotificationsClientProps {
  userId: string;
}

export default function NotificationsClient({ userId }: NotificationsClientProps) {
  const router = useRouter();

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => router.push('/login'));
  };

  return <Dashboard onLogout={handleLogout} userId={userId} userRole="RECEPTOR" />;
}