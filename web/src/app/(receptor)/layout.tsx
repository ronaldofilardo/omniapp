import Sidebar from '@/components/Sidebar';

export default function ReceptorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      {children}
    </main>
  );
}