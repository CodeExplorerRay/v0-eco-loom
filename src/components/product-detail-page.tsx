import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

type ProductDetailItem = {
  title: string;
  description: string;
  icon?: LucideIcon;
  step?: string;
};

type ProductDetailPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  itemsHeading: string;
  items: readonly ProductDetailItem[];
};

export function ProductDetailPage({
  eyebrow,
  title,
  description,
  itemsHeading,
  items,
}: ProductDetailPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-linear-to-b from-white via-green-50 to-emerald-50 pt-28 text-gray-900">
        <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
          <header className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              {eyebrow}
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-700">
              {description}
            </p>
          </header>

          <section aria-labelledby="product-details-heading" className="mt-16 lg:mt-20">
            <h2
              className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
              id="product-details-heading"
            >
              {itemsHeading}
            </h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article
                    className="rounded-2xl border border-green-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
                    key={item.title}
                  >
                    <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
                      {Icon ? (
                        <Icon aria-hidden="true" className="size-6" />
                      ) : (
                        <span aria-hidden="true" className="text-base font-bold">
                          {item.step ?? String(index + 1).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-950">{item.title}</h3>
                    <p className="mt-3 leading-7 text-gray-600">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-16 rounded-3xl border border-green-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10 lg:mt-20">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Ready to make your impact visible?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">
              Bring your emissions data, reporting, and goals into one practical workflow.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="bg-green-700 text-white hover:bg-green-800">
                <Link href="/dashboard">Start tracking</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Talk to our team</Link>
              </Button>
            </div>
          </section>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
