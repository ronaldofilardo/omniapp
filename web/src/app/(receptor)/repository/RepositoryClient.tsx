'use client';

import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';

interface RepositoryClientProps {
  userId: string;
}

export default function RepositoryClient({ userId }: RepositoryClientProps) {
  const router = useRouter();

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => router.push('/login'));
  };

  return <Dashboard onLogout={handleLogout} userId={userId} userRole="RECEPTOR" />;
}