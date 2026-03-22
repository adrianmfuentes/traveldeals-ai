import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AlertsSection from "@/components/dashboard/AlertsSection";
import DealsSection from "@/components/dashboard/DealsSection";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenido{session.user.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="mt-1 text-slate-500">
          Gestiona tus alertas de viaje y consulta las mejores ofertas encontradas.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <aside>
          <AlertsSection />
        </aside>
        <main>
          <DealsSection />
        </main>
      </div>
    </div>
  );
}
