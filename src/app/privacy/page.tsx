import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-white via-green-50 to-emerald-50">
      {/* Header */}
      <header className="border-b border-green-200/50 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link className="flex items-center gap-2" href="/">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-green-600 to-emerald-600 text-white shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-green-900">Eco-Loom</span>
          </Link>

          <Button asChild variant="ghost" className="text-sm text-gray-600 hover:text-green-700">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to site
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 mb-6">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-600">How we protect and handle your data</p>
          <p className="text-sm text-gray-500 mt-2">Last updated: March 26, 2026</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Eye className="h-6 w-6 text-green-600" />
              Information We Collect
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Eco-Loom is committed to transparency about the data we collect and how we use it to help your team track and reduce carbon emissions.
              </p>
              <h3 className="text-xl font-semibold text-gray-900 mt-6">Account Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email address and basic profile information</li>
                <li>Company information for emissions tracking context</li>
                <li>Access tokens for secure authentication</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6">Emissions Data</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Carbon emissions data you upload or input</li>
                <li>Activity logs related to emissions tracking</li>
                <li>Reports and analytics generated from your data</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6">Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>How you interact with our platform</li>
                <li>Performance metrics and error logs</li>
                <li>Device and browser information for optimization</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Lock className="h-6 w-6 text-green-600" />
              How We Use Your Data
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>Your data is used exclusively to provide and improve our emissions tracking service:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Emissions Tracking:</strong> Process and analyze your carbon data</li>
                <li><strong>Report Generation:</strong> Create insights and reports from your data</li>
                <li><strong>Platform Improvement:</strong> Enhance our service based on usage patterns</li>
                <li><strong>Security:</strong> Protect your account and data integrity</li>
                <li><strong>Communication:</strong> Send important updates about your account</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Security</h2>
            <div className="space-y-4 text-gray-700">
              <p>We implement industry-standard security measures to protect your data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>End-to-end encryption for data in transit and at rest</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and role-based permissions</li>
                <li>Secure authentication with hashed tokens</li>
                <li>Regular backups with encryption</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Sharing</h2>
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-green-700">We do NOT sell, trade, or share your data with third parties.</p>
              <p>Your emissions data remains completely private and is only accessible to authorized users within your organization.</p>
              <p>We may share anonymized, aggregated data for research purposes, but never individual company data.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Rights</h2>
            <div className="space-y-4 text-gray-700">
              <p>You have full control over your data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of all your data</li>
                <li><strong>Export:</strong> Download your data in standard formats</li>
                <li><strong>Delete:</strong> Request complete removal of your data</li>
                <li><strong>Update:</strong> Modify or correct your information</li>
                <li><strong>Transfer:</strong> Move your data to another service</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                If you have questions about this Privacy Policy or want to exercise your data rights,
                please contact us at <a href="mailto:privacy@eco-loom.com" className="text-green-600 hover:underline">privacy@eco-loom.com</a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}