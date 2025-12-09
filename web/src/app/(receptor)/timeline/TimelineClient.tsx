'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';

interface TimelineClientProps {
  userId: string;
}

export default function TimelineClient({ userId }: TimelineClientProps) {
  const router = useRouter();

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => router.push('/login'));
  };

  return <Dashboard onLogout={handleLogout} userId={userId} userRole="RECEPTOR" />;
}