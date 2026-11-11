import { getServerSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function SettingsIndexPage() {
  const session = await getServerSession();
  if (session?.role === 'SUPERADMIN') {
    redirect('/settings/app');
  }
  redirect('/settings/change-password');
}

