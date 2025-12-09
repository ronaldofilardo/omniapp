
import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import ResponsiveSidebarLayout from '@/components/ResponsiveSidebarLayout';

export default async function EmissorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await auth();

  // Renderiza o layout client-side para responsividade
  return (
    <ResponsiveSidebarLayout user={user}>
      {children}
    </ResponsiveSidebarLayout>
  );
}

