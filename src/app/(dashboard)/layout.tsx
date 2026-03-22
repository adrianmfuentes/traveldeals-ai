import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogOut, LayoutDashboard, Bell } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-base font-bold text-blue-600">TravelDeals AI</span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Bell size={14} />
                  Alertas
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 hidden sm:block">
                {session.user.name ?? session.user.email}
              </span>
              <form action="/api/auth/signout" method="POST">
                <Link
                  href="/api/auth/signout"
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Salir</span>
                </Link>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
