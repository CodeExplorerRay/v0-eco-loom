import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Check,
  Factory,
  FileText,
  Globe2,
  Leaf,
  MapPin,
  Target,
  Upload,
  Wind,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Upload,
    title: 'Upload Data',
    story: 'Start anywhere. Spreadsheets, PDFs, and exports all flow into one cleaner intake.',
  },
  {
    icon: BarChart3,
    title: 'View Instantly',
    story:
      'See your emissions dashboard as soon as data lands so patterns, hotspots, and gaps become visible fast.',
  },
  {
    icon: FileText,
    title: 'Generate Reports',
    story:
      'Create clean stakeholder-ready reports without stitching screenshots, spreadsheets, and docs together.',
  },
  {
    icon: Target,
    title: 'Track Progress',
    story:
      'Set goals, monitor movement, and turn carbon accounting into a repeatable operating habit.',
  },
];

const workflowSteps = [
  {
    step: '1',
    title: 'Load',
    story:
      'Bring emissions data in from spreadsheets, exports, or internal systems without rebuilding your workflow.',
  },
  {
    step: '2',
    title: 'Understand',
    story:
      'Use a live dashboard to review emissions by source, team, and period and spot the biggest movers.',
  },
  {
    step: '3',
    title: 'Report',
    story:
      'Export polished updates and share progress with leadership, customers, or auditors with less manual effort.',
  },
];

const proofPoints = [
  {
    title: 'Simple to start',
    description: 'Upload your first records and get useful output without a long implementation cycle.',
  },
  {
    title: 'Data you own',
    description: 'Your emissions data stays accessible and exportable instead of being locked behind a black box.',
  },
  {
    title: 'Transparent process',
    description: 'Track what was captured, how it is organized, and what still needs attention.',
  },
  {
    title: 'Built for action',
    description: 'Dashboards, reports, and targets stay tied together so teams can actually move on the work.',
  },
];

const heroHighlights = [
  {
    icon: MapPin,
    value: 'Multi-site',
    title: 'Facility-aware visibility',
    story: 'Track footprint movement across plants, hubs, offices, and labs in one workspace.',
  },
  {
    icon: Globe2,
    value: 'Scope 1-3',
    title: 'Carbon coverage that connects',
    story: 'Bring operational activity, emissions factors, and reporting outputs into one flow.',
  },
  {
    icon: Wind,
    value: 'Faster action',
    title: 'From data intake to reporting',
    story: 'Move from source records to dashboards, goals, and reports without spreadsheet drift.',
  },
];

const footprintSignals = ['Energy', 'Travel', 'Freight', 'Waste', 'Water'];

const footerLinks = [
  { label: 'How it works', href: '/#features' },
  { label: 'Features', href: '/#workflow' },
  { label: 'Why Eco-Loom', href: '/#proof' },
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
            'radial-gradient(circle at 12% 14%, rgba(74, 222, 128, 0.24), transparent 24%), radial-gradient(circle at 86% 8%, rgba(190, 242, 100, 0.2), transparent 22%), linear-gradient(180deg, #f8fdf9 0%, #edf9f1 30%, #f7fcf8 58%, #ffffff 100%)',
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

      <header className="fixed top-0 z-50 w-full border-b border-green-200/60 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link className="flex items-center gap-2" href="/">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-green-600 to-emerald-600 text-white shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-green-900">Eco-Loom</span>
          </Link>

          <nav className="hidden items-center gap-10 text-sm text-gray-600 lg:flex">
            <a className="font-medium transition hover:text-green-700" href="#features">
              How it works
            </a>
            <a className="font-medium transition hover:text-green-700" href="#workflow">
              Features
            </a>
            <a className="font-medium transition hover:text-green-700" href="#proof">
              Why use it
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              asChild
              className="h-9 text-xs text-gray-600 hover:text-green-700 sm:text-sm"
              variant="ghost"
            >
              <Link href="/login">Log in</Link>
            </Button>
            <Button
              asChild
              className="h-9 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white shadow-md transition-all duration-200 hover:bg-green-700 hover:shadow-lg sm:px-5 sm:text-sm"
            >
              <Link href="/dashboard">Start tracking</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pb-24 pt-32 lg:pb-32 lg:pt-40">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl opacity-70" />
          <div className="absolute right-0 top-28 h-96 w-96 rounded-full bg-lime-200/28 blur-3xl opacity-60" />
          <div className="absolute bottom-0 left-1/4 h-[28rem] w-[28rem] rounded-full bg-emerald-100/35 blur-3xl opacity-70" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:px-8">
          <div className="space-y-8">
            <div className="inline-flex animate-in fade-in slide-in-from-bottom-4 items-center gap-2 rounded-full border border-green-300/80 bg-white/78 px-4 py-1.5 text-xs font-semibold text-green-700 shadow-sm duration-700">
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
                <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-gray-900 lg:text-6xl">
                  Measure your carbon footprint.
                </h1>
                <h2 className="text-5xl font-bold text-green-700 lg:text-6xl">
                  Make it visible.
                </h2>
              </div>
              <p className="max-w-2xl text-lg font-medium leading-relaxed text-gray-700">
                Eco-Loom helps your team capture, track, and understand carbon emissions without
                spreadsheet chaos. Bring records in, see what matters, and move from reporting to
                action in one place.
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

            <div className="grid gap-3 sm:grid-cols-3">
              {heroHighlights.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="animate-in fade-in slide-in-from-bottom-6 rounded-2xl border border-green-200/80 bg-white/72 p-4 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.4)] backdrop-blur-sm duration-700"
                    style={{ animationDelay: `${260 + index * 110}ms` }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
                          {item.value}
                        </p>
                        <p className="mt-1 text-base font-semibold text-gray-900">{item.title}</p>
                      </div>
                      <div className="rounded-2xl bg-green-50 p-2.5 text-green-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600">{item.story}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="animate-in fade-in slide-in-from-right-8 duration-700"
            style={{ animationDelay: '180ms' }}
          >
            <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-white/56 shadow-[0_40px_120px_-50px_rgba(21,128,61,0.42)] backdrop-blur-xl">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 18% 24%, rgba(167, 243, 208, 0.72), transparent 24%), radial-gradient(circle at 84% 10%, rgba(236, 253, 245, 0.96), transparent 30%), linear-gradient(160deg, rgba(236, 253, 245, 0.96) 0%, rgba(209, 250, 229, 0.88) 48%, rgba(240, 253, 244, 0.92) 100%)',
                }}
              />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px)',
                  backgroundSize: '72px 72px',
                }}
              />

              <div className="absolute left-8 top-8 flex flex-wrap gap-2">
                {footprintSignals.map((signal, index) => (
                  <div
                    key={signal}
                    className="rounded-full border border-white/70 bg-white/88 px-3 py-1 text-xs font-medium text-slate-700 shadow-md"
                    style={{ transform: `translateY(${index % 2 === 0 ? 0 : 8}px)` }}
                  >
                    {signal}
                  </div>
                ))}
              </div>

              <div className="absolute right-8 top-20 w-56 rounded-3xl border border-white/70 bg-white/88 p-4 shadow-xl">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-2xl bg-lime-100 p-2.5 text-lime-700">
                    <Wind className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-700">
                      Carbon signal
                    </p>
                    <p className="text-sm font-semibold text-slate-900">See hotspots before they compound</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  Turn incoming activity into a cleaner sustainability operating picture across every site.
                </p>
              </div>

              <div className="absolute bottom-[5.5rem] left-8 w-64 rounded-3xl border border-white/75 bg-white/92 p-4 shadow-xl">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700">
                    <Factory className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                      Facility pulse
                    </p>
                    <p className="text-sm font-semibold text-slate-900">Operational carbon visibility</p>
                  </div>
                </div>
                <div className="grid gap-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2">
                    <span>Emissions intake</span>
                    <span className="font-semibold text-emerald-700">Live</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 shadow-sm">
                    <span>Site reporting</span>
                    <span className="font-semibold text-slate-900">Audit-ready</span>
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-10 top-16 h-24 rounded-full border border-emerald-300/35" />
              <div className="absolute inset-x-[4.5rem] top-24 h-24 rounded-full border border-emerald-300/20" />
              <div className="absolute left-16 top-28 h-20 w-20 rounded-full bg-lime-200/80 blur-2xl" />
              <div className="absolute right-20 top-14 h-16 w-16 rounded-full bg-emerald-200/85 blur-xl" />

              <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-emerald-50 via-emerald-100/70 to-transparent" />
              <div className="absolute -bottom-10 left-[-3%] h-48 w-[62%] rounded-[50%] bg-emerald-500/26" />
              <div className="absolute -bottom-8 right-[-2%] h-52 w-[68%] rounded-[50%] bg-emerald-700/18" />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-950/10 to-transparent" />

              <div className="absolute bottom-0 left-1/2 flex w-[78%] -translate-x-1/2 items-end gap-2">
                <div className="h-14 flex-1 rounded-t-[1.75rem] bg-slate-900/76" />
                <div className="h-24 w-16 rounded-t-[1.5rem] bg-slate-900/82" />
                <div className="h-16 w-10 rounded-t-[1rem] bg-slate-900/70" />
                <div className="h-28 w-20 rounded-t-[1.5rem] bg-slate-900/86" />
                <div className="h-[4.5rem] w-12 rounded-t-[1rem] bg-slate-900/74" />
              </div>
            </div>
          </div>
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
            <video
              aria-label="Eco-Loom demo video"
              className="aspect-video w-full"
              autoPlay
              controls
              loop
              muted
              playsInline
              preload="metadata"
            >
              <source src="/demo-video/eco-loom-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
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
            {features.map((feature, index) => {
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
                  <p className="font-medium leading-relaxed text-gray-600">{feature.story}</p>
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
            {workflowSteps.map((item, index) => (
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
                  <p className="font-medium leading-relaxed text-gray-600">{item.story}</p>
                </div>
                {index < workflowSteps.length - 1 ? (
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
            {proofPoints.map((point, index) => (
              <div
                key={point.title}
                className="group flex animate-in fade-in slide-in-from-bottom-6 gap-4 rounded-xl border border-green-200 bg-green-50 p-6 transition-all duration-300 hover:border-green-400 hover:shadow-md"
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
                    {link.href.startsWith('/#') ? (
                      <a className="transition hover:text-green-700" href={link.href}>
                        {link.label}
                      </a>
                    ) : (
                      <Link className="transition hover:text-green-700" href={link.href}>
                        {link.label}
                      </Link>
                    )}
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
