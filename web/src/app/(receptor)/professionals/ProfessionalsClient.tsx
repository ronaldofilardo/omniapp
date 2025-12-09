'use client';

import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';

interface ProfessionalsClientProps {
  userId: string;
}

export default function ProfessionalsClient({ userId }: ProfessionalsClientProps) {
  const router = useRouter();

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => router.push('/login'));
  };

  return <Dashboard onLogout={handleLogout} userId={userId} userRole="RECEPTOR" />;
}