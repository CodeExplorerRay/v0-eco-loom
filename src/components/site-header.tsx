import Link from 'next/link';
import { Leaf, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigationLinks = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Why Eco-Loom', href: '/why-eco-loom' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Journal', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-2xl border border-white/85 bg-white/62 px-3 py-2.5 shadow-[0_16px_46px_-24px_rgba(6,78,59,0.48)] ring-1 ring-emerald-950/5 backdrop-blur-2xl sm:gap-4 sm:px-4 sm:py-3 lg:px-8">
        <Link className="flex shrink-0 items-center gap-2.5" href="/">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-green-600 to-emerald-600 text-white shadow-sm">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-green-950">Eco-Loom</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-5 text-sm text-gray-600 min-[1120px]:flex">
          {navigationLinks.map((item) => (
            <Link
              className="whitespace-nowrap font-medium transition-colors hover:text-green-700"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <details className="group relative min-[1120px]:hidden">
          <summary
            aria-label="Open site navigation"
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-gray-700 transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 [&::-webkit-details-marker]:hidden"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </summary>
          <nav
            aria-label="Primary navigation"
            className="absolute right-0 top-12 grid w-56 gap-1 rounded-xl border border-white/85 bg-white/95 p-2 shadow-[0_16px_46px_-24px_rgba(6,78,59,0.48)] ring-1 ring-emerald-950/5 backdrop-blur-2xl"
          >
            {navigationLinks.map((item) => (
              <Link
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </details>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Button
            asChild
            className="hidden h-9 px-2.5 text-xs font-medium text-gray-600 hover:text-green-700 min-[400px]:inline-flex sm:px-3 sm:text-sm"
            variant="ghost"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            className="h-9 whitespace-nowrap rounded-lg bg-green-600 px-2.5 py-2 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-green-700 min-[360px]:px-3 min-[400px]:px-4 min-[400px]:text-xs sm:px-5 sm:text-sm"
          >
            <Link href="/dashboard">Start tracking</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
