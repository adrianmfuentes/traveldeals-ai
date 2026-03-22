import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4">
      <header className="w-full max-w-md mx-auto pt-2 pb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors">
          <ArrowLeft size={15} />
          Volver
        </Link>
        <Link href="/" className="flex items-center gap-1.5">
          <Plane size={15} className="text-blue-600" />
          <span className="text-sm font-bold text-slate-800">TravelDeals AI</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
