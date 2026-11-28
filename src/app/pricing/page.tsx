import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, Star, Zap, Users, Building, Crown } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Explore Eco-Loom plans for emissions tracking, sustainability reporting, and carbon accounting workflows.',
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "per month",
      description: "Perfect for small teams getting started with emissions tracking",
      icon: <Zap className="w-6 h-6" />,
      features: [
        "Up to 25 team members",
        "Basic emissions tracking",
        "Standard reports",
        "Email support",
        "Data import/export",
        "Mobile app access"
      ],
      limitations: [
        "Advanced analytics",
        "Custom integrations",
        "Priority support",
        "API access"
      ],
      popular: false,
      cta: "Start Free Trial"
    },
    {
      name: "Professional",
      price: "$99",
      period: "per month",
      description: "Ideal for growing companies with comprehensive sustainability needs",
      icon: <Users className="w-6 h-6" />,
      features: [
        "Up to 100 team members",
        "Advanced emissions tracking",
        "Custom reports & dashboards",
        "Priority email support",
        "API access",
        "Custom integrations",
        "Advanced analytics",
        "Team collaboration tools"
      ],
      limitations: [
        "Unlimited team members",
        "Dedicated success manager",
        "Custom training sessions"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "Tailored solutions for large organizations with complex requirements",
      icon: <Crown className="w-6 h-6" />,
      features: [
        "Unlimited team members",
        "Everything in Professional",
        "Dedicated success manager",
        "Custom integrations",
        "On-premise deployment",
        "Advanced security features",
        "Custom training sessions",
        "24/7 phone support",
        "SLA guarantees"
      ],
      limitations: [],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const faqs = [
    {
      question: "Can I change plans at any time?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! We offer a 14-day free trial for all plans. No credit card required to get started."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "You can export all your data at any time. We retain your data for 30 days after cancellation in case you want to reactivate your account."
    },
    {
      question: "Do you offer discounts for nonprofits?",
      answer: "Yes, we offer special pricing for qualified nonprofit organizations. Contact our sales team to learn more."
    },
    {
      question: "Can I add more team members to my plan?",
      answer: "Absolutely. You can add team members at any time. Additional members are billed at $5/month each."
    },
    {
      question: "What kind of support do you provide?",
      answer: "All plans include email support. Professional plans get priority support, and Enterprise plans include 24/7 phone support and a dedicated success manager."
    }
  ];

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
            Transparent pricing
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
              Choose the plan that
              <span className="block text-green-700">fits your impact goals</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-700 leading-relaxed">
              Start tracking emissions today with our flexible pricing. All plans include
              our core features with no hidden fees or surprise charges.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl border-2 p-8 ${
                  plan.popular
                    ? 'border-green-500 shadow-xl scale-105'
                    : 'border-green-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    plan.popular ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <div className={plan.popular ? 'text-green-600' : 'text-gray-600'}>
                      {plan.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">What's included:</h4>
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan.limitations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Not included:</h4>
                      {plan.limitations.map((limitation, limitIndex) => (
                        <div key={limitIndex} className="flex items-center gap-3">
                          <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500 text-sm">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  asChild
                  className={`w-full py-3 font-semibold ${
                    plan.popular
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : plan.name === 'Enterprise'
                      ? 'bg-gray-900 hover:bg-gray-800 text-white'
                      : 'bg-white border-2 border-green-600 text-green-600 hover:bg-green-50'
                  }`}
                >
                  <Link href={plan.name === 'Enterprise' ? '/contact' : '/dashboard'}>
                    {plan.cta}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 lg:py-32 bg-linear-to-b from-green-50 to-white">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Compare all features
            </h2>
            <p className="text-lg text-gray-600">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-green-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Features</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Starter</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Professional</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  "Team members",
                  "Emissions tracking",
                  "Reports & dashboards",
                  "Data import/export",
                  "API access",
                  "Custom integrations",
                  "Advanced analytics",
                  "Priority support",
                  "Dedicated success manager",
                  "Custom training",
                  "24/7 phone support"
                ].map((feature, index) => (
                  <tr key={index} className="border-b border-green-100">
                    <td className="py-4 px-6 font-medium text-gray-900">{feature}</td>
                    <td className="py-4 px-6 text-center">
                      {index < 6 ? (
                        <Check className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {index < 8 ? (
                        <Check className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-linear-to-b from-green-50 to-emerald-50">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Ready to start tracking emissions?
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands of companies already using Eco-Loom to measure and reduce their environmental impact.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="h-12 rounded-lg bg-green-600 px-8 text-base font-semibold text-white hover:bg-green-700 transition-all duration-300 hover:shadow-lg shadow-md">
              <Link href="/dashboard">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-lg border-2 border-green-200 bg-white px-8 text-base font-semibold text-green-700 hover:bg-green-50 transition-all duration-200">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>

          <p className="text-sm text-gray-500">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
