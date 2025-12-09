import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReportsDashboard } from '@/components/ReportsDashboard';

export default async function RelatoriosPage() {
  const user = await auth();

  if (!user || user.role !== 'EMISSOR') {
    redirect('/login');
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Relatórios</h1>
      <ReportsDashboard />
    </div>
  );
}