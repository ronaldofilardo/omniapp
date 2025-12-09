import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function EmissorPage() {
  const user = await auth();

  if (!user || user.role !== 'EMISSOR') {
    redirect('/login');
  }

  // Redirecionar para o portal de laudos
  redirect('/laudos');
}