import { auth } from '@/lib/auth';
import PersonalDataTab from '@/components/PersonalDataTab';

export default async function DadosPessoaisPage() {
  const user = await auth();
  return <PersonalDataTab userId={user!.id} />;
}