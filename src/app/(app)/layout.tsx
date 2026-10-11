import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import Shell from '@/components/Shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = (await currentUser()) as any;
  if (!user) redirect('/login');
  return (
    <Shell
      user={{
        name: user.name,
        email: user.email,
        streak: user.streak ?? 0,
        emailVerified: Boolean(user.emailVerified),
      }}
    >
      {children}
    </Shell>
  );
}
