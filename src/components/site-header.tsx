import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border border-white/85 bg-white/62 px-4 py-3 shadow-[0_16px_46px_-24px_rgba(6,78,59,0.48)] ring-1 ring-emerald-950/5 backdrop-blur-2xl lg:px-8">
        <Link className="flex items-center gap-2.5" href="/">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-green-600 to-emerald-600 text-white shadow-sm">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-green-950">Eco-Loom</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-gray-600 min-[960px]:flex">
          <Link className="font-medium transition-colors hover:text-green-700" href="/how-it-works">
            How it works
          </Link>
          <Link className="font-medium transition-colors hover:text-green-700" href="/features">
            Features
          </Link>
          <Link className="font-medium transition-colors hover:text-green-700" href="/why-eco-loom">
            Why Eco-Loom
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            className="h-9 px-3 text-xs font-medium text-gray-600 hover:text-green-700 sm:text-sm"
            variant="ghost"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            className="h-9 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 sm:px-5 sm:text-sm"
          >
            <Link href="/dashboard">Start tracking</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
