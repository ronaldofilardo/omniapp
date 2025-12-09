import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ExternalLabSubmit from '@/components/ExternalLabSubmit';

export default async function PortalLaudosPage() {
  const user = await auth();

  if (!user || user.role !== 'EMISSOR') {
    redirect('/login');
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Portal de Envio</h1>
      <ExternalLabSubmit />
    </div>
  );
}