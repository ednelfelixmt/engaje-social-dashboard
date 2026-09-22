import {requireAdmin} from '@/lib/auth/session';
import {Navigation} from '@/components/navigation';

export default async function Layout({children}: {children: React.ReactNode}) {
  await requireAdmin();
  return <><Navigation admin /><main className="dashboard-shell min-h-screen px-4 py-6 sm:px-6 lg:ml-[272px] lg:px-9 lg:py-10 2xl:px-12">{children}</main></>;
}
