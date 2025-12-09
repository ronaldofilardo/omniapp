import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProfessionalsTab } from '@/components/ProfessionalsTab';

function resolveBaseUrl() {
  // Prefer env específica se existir
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // Em ambientes Vercel
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Fallback local
  return 'http://localhost:3000';
}

async function getProfessionals(userId: string) {
  const base = resolveBaseUrl();
  const res = await fetch(`${base}/api/professionals?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  return res.ok ? res.json() : [];
}

export default async function ProfessionalsPage() {
  const user = await auth();
  // O componente ProfessionalsTab gerencia seus próprios profissionais via contexto
  return <ProfessionalsTab userId={user!.id} />;
}