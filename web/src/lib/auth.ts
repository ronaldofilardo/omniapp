import { cookies } from 'next/headers';

export interface User {
  id: string;
  email?: string;
  name?: string | null;
  role: 'EMISSOR' | 'RECEPTOR' | 'ADMIN';
}

export async function auth(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('kairos_imob_session');
  if (!session) return null;
  // Esperado: valor do cookie = id:email:role
  const [id, email, role] = session.value.split(':');
  if (!id || !email || !role) return null;
  return {
    id,
    email,
    role: role as 'EMISSOR' | 'RECEPTOR' | 'ADMIN',
  };
}

export async function isEmissor(user: User | null): Promise<boolean> {
  if (!user) return false;
  return user.role === 'EMISSOR';
}

export async function isReceptor(user: User | null): Promise<boolean> {
  if (!user) return false;
  return user.role === 'RECEPTOR';
}

export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  return user.role === 'ADMIN';
}
