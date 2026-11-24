import Link from 'next/link';
import { Leaf } from 'lucide-react';

const productLinks = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Why Eco-Loom', href: '/why-eco-loom' },
];

const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Security', href: '/security' },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-green-200/90 bg-white/96">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-8 grid gap-10 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-green-600 to-emerald-600 text-white">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-green-950">Eco-Loom</span>
            </div>
            <p className="max-w-sm text-sm leading-6 text-gray-600">
              Track carbon, understand emissions, and build a clearer sustainability workflow.
            </p>
          </div>

          <nav>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-900">Product</p>
            <ul className="space-y-2.5 text-sm text-gray-600">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link className="font-medium transition-colors hover:text-green-700" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-900">Company</p>
            <ul className="space-y-2.5 text-sm text-gray-600">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link className="font-medium transition-colors hover:text-green-700" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-900">Legal</p>
            <ul className="space-y-2.5 text-sm text-gray-600">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link className="font-medium transition-colors hover:text-green-700" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-green-200 pt-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-600" />
            <span>Eco-Loom © {year}. Built for teams tracking emissions.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
