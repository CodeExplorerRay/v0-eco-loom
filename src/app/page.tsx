import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Factory,
  Globe2,
  Leaf,
} from 'lucide-react';
import { ProductScreenshotCarousel } from '@/components/marketing/product-preview-carousel';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import {
  productBenefits,
  productFeatures,
  productWorkflowSteps,
} from '@/lib/marketing/product-content';

export const metadata: Metadata = {
  title: 'Eco-Loom | Carbon Accounting & ESG Operations',
  description:
    'Bring facility activity, Scope 1–3 emissions, and sustainability reporting together with Eco-Loom’s carbon accounting workspace.',
  alternates: { canonical: '/' },
};

const heroHighlights = [
  {
    icon: Factory,
    value: 'Multi-site',
    title: 'Facility-aware visibility',
    story: 'Track footprint movement across plants, hubs, offices, and labs in one workspace.',
  },
  {
    icon: Globe2,
    value: 'Scope 1–3',
    title: 'Carbon coverage that connects',
    story: 'Bring operational activity, emissions factors, and reporting outputs into one flow.',
  },
  {
    icon: ArrowRight,
    value: 'Faster action',
    title: 'From data intake to reporting',
    story: 'Move from source records to dashboards, goals, and reports without spreadsheet drift.',
  },
];

const footerLinks = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Why Eco-Loom', href: '/why-eco-loom' },
  { label: 'Pricing', href: '/pricing' },
];

const companyFooterLinks = [
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

const legalFooterLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Security', href: '/security' },
];

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-linear-to-b from-white via-green-50/70 to-emerald-50/45 text-gray-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 14%, rgba(74, 222, 128, 0.24), transparent 24%), radial-gradient(circle at 86% 8%, rgba(190, 242, 100, 0.2), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0))'
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(rgba(21, 128, 61, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21, 128, 61, 0.06) 1px, transparent 1px)',
          backgroundSize: '84px 84px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.72), transparent)',
        }}
      />

      <SiteHeader />

      <section className="relative isolate overflow-hidden pb-24 pt-32 lg:pb-32 lg:pt-40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50rem] overflow-hidden lg:h-[58rem]"
        >
          <Image
            alt=""
            className="object-cover object-[10%_center] sm:object-center"
            fill
            priority
            sizes="100vw"
            src="/eco-loom-hero-bg.png"
          />
          <div className="absolute inset-0 bg-white/72 lg:bg-linear-to-r lg:from-white/95 lg:via-white/78 lg:to-white/38" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent to-emerald-50/60" />
        </div>

        <div className="mx-auto grid max-w-7xl items-start gap-10 px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:px-8">
          <div className="space-y-8">
            <div className="inline-flex animate-in fade-in slide-in-from-bottom-4 items-center gap-2 rounded-full border border-green-300/80 bg-white/78 px-4 py-1.5 text-xs font-semibold text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-600" />
              Carbon operations for modern sustainability teams
            </div>

            <div
              className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700"
              style={{ animationDelay: '120ms' }}
            >
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-green-700">
                  For teams committed to sustainability
                </p>
                <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                  Carbon visibility for every site.
                </h1>
              </div>
              <p className="max-w-2xl text-lg font-medium leading-relaxed text-gray-700">
                Bring facility activity, Scope 1–3 carbon coverage, and reporting together. Move from
                source data to action without spreadsheet drift.
              </p>
            </div>

            <div
              className="flex animate-in fade-in slide-in-from-bottom-8 flex-col gap-4 pt-2 duration-700 sm:flex-row"
              style={{ animationDelay: '220ms' }}
            >
              <Button
                asChild
                className="h-12 rounded-lg bg-green-600 px-8 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-green-700 hover:shadow-lg"
              >
                <Link href="/dashboard">
                  Start tracking
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                className="h-12 rounded-lg border-2 border-green-200 bg-white/90 px-8 text-base font-semibold text-green-700 transition-all duration-200 hover:bg-green-50"
                variant="outline"
              >
                <Link href="/login">See a demo</Link>
              </Button>
            </div>

          </div>

          <div
            className="animate-in fade-in slide-in-from-right-8 duration-700"
            style={{ animationDelay: '180ms' }}
          >
            <ProductScreenshotCarousel />
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-7xl gap-4 px-6 md:grid-cols-3 lg:px-8">
          {heroHighlights.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="animate-in fade-in slide-in-from-bottom-6 rounded-2xl border border-green-200/80 bg-white/80 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.4)] backdrop-blur-sm duration-700"
                style={{ animationDelay: `${260 + index * 110}ms` }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
                      {item.value}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-gray-900">{item.title}</h2>
                  </div>
                  <div className="rounded-2xl bg-green-50 p-2.5 text-green-700 shadow-sm">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{item.story}</p>
              </article>
            );
          })}
        </div>

        <div
          className="mx-auto mt-16 max-w-6xl animate-in fade-in slide-in-from-bottom-10 px-6 duration-700 lg:px-8"
          style={{ animationDelay: '320ms' }}
        >
          <div className="overflow-hidden rounded-[2rem] border border-green-200/80 bg-white/70 shadow-[0_35px_90px_-45px_rgba(21,128,61,0.38)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-green-100 bg-white/80 px-5 py-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Eco-Loom workspace preview
              </div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-green-700">
                Carbon footprint flow
              </div>
            </div>
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                  src="https://www.youtube.com/embed/nh4vfntr4SY?autoplay=1&mute=1&loop=1&playlist=nh4vfntr4SY&controls=0&rel=0&modestbranding=1&playsinline=1"
                title="Eco-Loom demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20 lg:py-32" id="features">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-green-100/40 blur-3xl opacity-40" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-emerald-100/30 blur-3xl opacity-30" />
        </div>

        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mb-16 space-y-4 text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
            <p className="text-sm font-semibold uppercase tracking-wider text-green-700">
              How it works
            </p>
            <h2 className="text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
              Capture emissions. Understand them. Act on them.
            </h2>
            <p className="text-lg font-medium text-gray-600">
              Four simple tools to make carbon tracking feel lighter.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {productFeatures.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group animate-in fade-in slide-in-from-bottom-6 rounded-2xl border border-green-200 bg-white p-8 transition-all duration-300 hover:border-green-400 hover:shadow-lg"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br from-green-100 to-emerald-100">
                    <Icon className="h-6 w-6 text-green-700" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">{feature.title}</h3>
                  <p className="font-medium leading-relaxed text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden bg-linear-to-b from-green-50/80 to-white py-20 lg:py-32"
        id="workflow"
      >
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl opacity-40" />
        </div>

        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mb-16 space-y-4 text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
            <p className="text-sm font-semibold uppercase tracking-wider text-green-700">
              The Process
            </p>
            <h2 className="text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
              Three steps to clarity
            </h2>
            <p className="text-lg font-medium text-gray-600">
              From scattered records to useful insights in minutes, not months.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {productWorkflowSteps.map((item, index) => (
              <div
                key={item.step}
                className="relative animate-in fade-in slide-in-from-bottom-6"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="rounded-2xl border border-green-200 bg-white p-8 transition-all duration-300 hover:border-green-400 hover:shadow-lg">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
                    {item.step}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-gray-900">{item.title}</h3>
                  <p className="font-medium leading-relaxed text-gray-600">{item.description}</p>
                </div>
                {index < productWorkflowSteps.length - 1 ? (
                  <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 md:block">
                    <ArrowRight className="h-6 w-6 text-green-300" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20 lg:py-32" id="proof">
        <div className="absolute inset-0 -z-10">
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-green-100/40 blur-3xl opacity-40" />
          <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-emerald-100/30 blur-3xl opacity-40" />
        </div>

        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mb-16 space-y-4 text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
            <p className="text-sm font-semibold uppercase tracking-wider text-green-700">
              Why Eco-Loom
            </p>
            <h2 className="text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
              Built for teams that care
            </h2>
            <p className="text-lg font-medium text-gray-600">
              Less compliance theater. More visibility, accountability, and momentum.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {productBenefits.map((point, index) => (
              <div
                key={point.title}
                className="group flex animate-in fade-in slide-in-from-bottom-6 gap-4 rounded-xl border border-green-200 bg-green-50 p-6 transition-all duration-300 hover:border-green-400 hover:shadow-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <p className="font-semibold leading-relaxed text-gray-900">{point.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-linear-to-b from-white to-green-50 py-20 lg:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-1/4 top-0 h-96 w-96 rounded-full bg-green-200/30 blur-3xl opacity-40" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl opacity-30" />
        </div>

        <div className="mx-auto max-w-3xl space-y-8 px-6 text-center lg:px-8">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h2 className="text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
              Ready to measure what matters?
            </h2>
            <p className="text-lg font-medium text-gray-700">
              Start tracking carbon emissions today and turn environmental reporting into something
              your team can actually use.
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Button
              asChild
              className="inline-flex h-12 rounded-lg bg-green-600 px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-green-700 hover:shadow-xl"
            >
              <Link href="/dashboard">
                Start tracking
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-green-200/90 bg-white/96 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="mb-8 grid gap-10 md:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr]">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-green-600 to-emerald-600 text-white">
                  <Leaf className="h-4 w-4" />
                </div>
                <span className="font-bold text-green-900">Eco-Loom</span>
              </div>
              <p className="max-w-sm text-sm font-medium leading-relaxed text-gray-600">
                Track carbon, understand emissions, and build a clearer sustainability workflow.
              </p>
            </div>

            <nav>
              <p className="mb-3 text-sm font-semibold text-gray-900">Product</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {footerLinks.map((link) => (
                  <li key={link.label}>
                    <Link className="transition hover:text-green-700" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav>
              <p className="mb-3 text-sm font-semibold text-gray-900">Company</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {companyFooterLinks.map((link) => (
                  <li key={link.label}>
                    <Link className="transition hover:text-green-700" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav>
              <p className="mb-3 text-sm font-semibold text-gray-900">Legal</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {legalFooterLinks.map((link) => (
                  <li key={link.label}>
                    <Link className="transition hover:text-green-700" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex flex-col gap-4 border-t border-green-200 pt-8 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <span>Eco-Loom © {year}. Built for teams tracking emissions.</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
