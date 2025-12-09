import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await auth();
  if (!user) {
    redirect('/login');
  }
  // Redireciona para a rota inicial correta conforme o papel
  if (user.role === 'EMISSOR') {
    redirect('/laudos');
  } else if (user.role === 'ADMIN') {
    redirect('/admin/dashboard');
  } else {
    redirect('/timeline');
  }
}
