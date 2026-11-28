import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Target, Award, Heart } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Eco-Loom’s mission to make sustainability data visible, trustworthy, and actionable for every team.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-white via-green-50 to-emerald-50">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-b from-green-100/30 via-emerald-50/20 to-transparent" />
          <div className="absolute top-40 right-0 h-80 w-80 bg-green-200/30 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-1/4 h-96 w-96 bg-emerald-200/20 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-300 bg-green-50 px-4 py-1.5 text-xs font-semibold text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
            About Eco-Loom
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
              Making sustainability
              <span className="block text-green-700">visible and actionable</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-700 leading-relaxed">
              Eco-Loom is built to help organizations understand their environmental impact,
              set meaningful goals, and drive real change. Every company deserves a clearer view of its carbon footprint.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                From spreadsheet chaos to clear insights
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Eco-Loom started with a simple observation: too many companies want to track their emissions
                but get lost in complex spreadsheets and disconnected tools. What if there was a better way?
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Eco-Loom was built from the belief that sustainability should be accessible to every team,
                not just those with dedicated environmental departments. The goal is to make carbon tracking
                as simple as it should be.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-square bg-linear-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-green-700 font-semibold">Clear goals, measurable progress</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 lg:py-32 bg-linear-to-b from-green-50 to-white">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              The values behind Eco-Loom
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These principles shape the product direction, the workflow design, and the way the platform approaches sustainability work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Transparency</h3>
              <p className="text-gray-600">
                Eco-Loom is built around clear methods, understandable workflows,
                and a visible approach to privacy, data handling, and review.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Accessibility</h3>
              <p className="text-gray-600">
                Sustainability tools should be available to every organization,
                regardless of size or technical expertise.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Impact</h3>
              <p className="text-gray-600">
                Eco-Loom is meant to support a more
                sustainable future for our planet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-linear-to-b from-green-50 to-emerald-50">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Ready to make your impact visible?
          </h2>
          <p className="text-lg text-gray-600">
            Join hundreds of teams already using Eco-Loom to track and reduce their carbon emissions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="h-12 rounded-lg bg-green-600 px-8 text-base font-semibold text-white hover:bg-green-700 transition-all duration-300 hover:shadow-lg shadow-md">
              <Link href="/dashboard">Start tracking emissions</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-lg border-2 border-green-200 bg-white px-8 text-base font-semibold text-green-700 hover:bg-green-50 transition-all duration-200">
              <Link href="/contact">Get in touch</Link>
            </Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
