import { getCurrentUser } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <AdminNav user={user}>{children}</AdminNav>;
}
