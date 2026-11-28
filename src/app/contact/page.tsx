import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageSquare, Phone, MapPin, Send } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Contact Eco-Loom',
  description:
    'Contact Eco-Loom to discuss carbon accounting, emissions tracking, and sustainability reporting for your organization.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
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
            Get in touch
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
              Let's talk about
              <span className="block text-green-700">your sustainability journey</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-700 leading-relaxed">
              Whether you have questions about Eco-Loom, need help with implementation,
              or want to discuss how we can support your climate goals, we're here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Email Us</h3>
              <p className="text-gray-600">
                Send us an email and we'll get back to you within 24 hours.
              </p>
              <a
                href="mailto:hello@eco-loom.com"
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
              >
                hello@eco-loom.com
                <Send className="w-4 h-4" />
              </a>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Live Chat</h3>
              <p className="text-gray-600">
                Chat with our team during business hours for immediate assistance.
              </p>
              <button className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium">
                Start a conversation
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                <Phone className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Call Us</h3>
              <p className="text-gray-600">
                Schedule a call with our sustainability experts.
              </p>
              <a
                href="tel:+1-555-ECO-LOOM"
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
              >
                +1 (555) ECO-LOOM
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-8 lg:p-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Send us a message</h2>
                <p className="text-gray-600">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>
              </div>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Select a topic</option>
                    <option value="demo">Request a demo</option>
                    <option value="support">Technical support</option>
                    <option value="partnership">Partnership inquiry</option>
                    <option value="pricing">Pricing questions</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Tell us how we can help..."
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-semibold">
                  Send Message
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Office Information */}
      <section className="py-20 lg:py-32 bg-linear-to-b from-green-50 to-emerald-50">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Visit our office
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Located in the heart of San Francisco's innovation district,
                our office is a hub for sustainability technology and climate action.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">San Francisco Office</p>
                    <p className="text-gray-600">
                      123 Mission Street<br />
                      Suite 456<br />
                      San Francisco, CA 94105
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-gray-600">+1 (555) ECO-LOOM</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">hello@eco-loom.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-linear-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                <div className="text-center space-y-4">
                  <MapPin className="w-12 h-12 text-green-600 mx-auto" />
                  <p className="text-green-700 font-semibold">San Francisco, CA</p>
                  <p className="text-sm text-gray-600">Serving clients worldwide</p>
                </div>
              </div>
            </div>
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
              Quick answers to common questions about Eco-Loom and getting started.
            </p>
          </div>

          <div className="space-y-6">
            <div className="border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How quickly can I get started with Eco-Loom?
              </h3>
              <p className="text-gray-600">
                Most teams are up and running within 24 hours. We provide comprehensive onboarding
                support and can import your existing emissions data to get you started immediately.
              </p>
            </div>

            <div className="border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer training for my team?
              </h3>
              <p className="text-gray-600">
                Yes! We provide comprehensive training sessions, documentation, and ongoing support
                to ensure your team can effectively use Eco-Loom for emissions tracking and reporting.
              </p>
            </div>

            <div className="border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can Eco-Loom integrate with our existing systems?
              </h3>
              <p className="text-gray-600">
                Absolutely. We offer APIs and integrations with popular business tools, ERPs,
                and data sources. Our team can help you set up custom integrations as needed.
              </p>
            </div>

            <div className="border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What kind of support do you provide?
              </h3>
              <p className="text-gray-600">
                We offer email support, live chat during business hours, phone support for urgent issues,
                and dedicated customer success managers for enterprise clients.
              </p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
