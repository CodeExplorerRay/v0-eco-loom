import Link from 'next/link';
import { ArrowLeft, FileText, Scale, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
            <Scale className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-lg text-gray-600">The agreement governing your use of Eco-Loom</p>
          <p className="text-sm text-gray-500 mt-2">Last updated: March 26, 2026</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Acceptance of Terms</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                By accessing and using Eco-Loom, you accept and agree to be bound by the terms and provision of this agreement.
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <FileText className="h-6 w-6 text-green-600" />
              Service Description
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Eco-Loom is a carbon emissions tracking platform designed to help organizations measure,
                understand, and reduce their environmental impact.
              </p>
              <p>Our service includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Data upload and processing for emissions tracking</li>
                <li>Report generation and analytics</li>
                <li>Dashboard and visualization tools</li>
                <li>Team collaboration features</li>
                <li>API access for integrations</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">User Responsibilities</h2>
            <div className="space-y-4 text-gray-700">
              <h3 className="text-xl font-semibold text-gray-900">Account Security</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintain the confidentiality of your access tokens</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Use strong, unique passwords for your accounts</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6">Data Accuracy</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate and complete emissions data</li>
                <li>Verify data before uploading to our platform</li>
                <li>Report any data discrepancies promptly</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6">Acceptable Use</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the service only for lawful purposes</li>
                <li>Do not attempt to circumvent security measures</li>
                <li>Respect the privacy and data of other users</li>
                <li>Do not upload malicious or harmful data</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Ownership</h2>
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-green-700">
                You retain full ownership of all data you upload to Eco-Loom.
              </p>
              <p>
                We act as a custodian of your data, processing it according to your instructions
                and our privacy policy. You may export or delete your data at any time.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Availability</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We strive for high availability but cannot guarantee uninterrupted service.
                We reserve the right to perform maintenance and updates.
              </p>
              <p>
                In case of service interruptions, we will communicate transparently
                and work to restore service as quickly as possible.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Limitation of Liability</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Eco-Loom is provided "as is" without warranties of any kind.
                We are not liable for any indirect, incidental, or consequential damages.
              </p>
              <p>
                Our total liability shall not exceed the amount paid for the service in the 12 months preceding the claim.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Termination</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Either party may terminate this agreement at any time.
                Upon termination, you may export your data within 30 days.
              </p>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Changes to Terms</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We may update these terms occasionally. Material changes will be communicated
                via email or platform notifications.
              </p>
              <p>
                Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                For questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:legal@eco-loom.com" className="text-green-600 hover:underline">legal@eco-loom.com</a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}