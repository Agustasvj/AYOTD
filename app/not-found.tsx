import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full border border-red-600/60 overflow-hidden bg-black mb-6 shadow-[0_0_25px_rgba(185,28,53,0.3)]">
        <img src="/logo.jpg" alt="AYOTD Delicacies Logo" className="w-full h-full object-cover" />
      </div>

      <div className="eyebrow mb-2">Page Not Found</div>
      <h1 className="text-4xl font-extrabold text-white mb-3">404 - Lost on Campus?</h1>
      <p className="text-zinc-400 text-sm max-w-md mb-8">
        We couldn&apos;t find the page you are looking for. You might want to check today&apos;s
        fresh menu or track an existing order.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary text-xs px-5 py-2.5 font-bold flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Homepage
        </Link>
        <Link href="/track" className="btn-secondary text-xs px-5 py-2.5">
          Track Your Order
        </Link>
      </div>
    </div>
  );
}

