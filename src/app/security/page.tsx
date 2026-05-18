import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Key, Database, Users, AlertTriangle, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SecurityPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Security Overview</h1>
          <p className="text-lg text-gray-600">How we protect your emissions data</p>
          <p className="text-sm text-gray-500 mt-2">Last updated: March 26, 2026</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Security Commitment</h2>
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-green-700 text-lg">
                Security is fundamental to Eco-Loom's mission of helping organizations track and reduce emissions.
              </p>
              <p>
                We implement comprehensive security measures to ensure your data remains protected,
                private, and available when you need it.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Lock className="h-6 w-6 text-green-600" />
              Data Encryption
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>All data is encrypted both in transit and at rest:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>TLS 1.3 encryption</strong> for all data in transit</li>
                <li><strong>AES-256 encryption</strong> for data at rest in our databases</li>
                <li><strong>Encrypted backups</strong> with secure key management</li>
                <li><strong>End-to-end encryption</strong> for sensitive API communications</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Key className="h-6 w-6 text-green-600" />
              Authentication & Access Control
            </h2>
            <div className="space-y-4 text-gray-700">
              <h3 className="text-xl font-semibold text-gray-900">Secure Authentication</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Token-based authentication with secure hashing</li>
                <li>Session management with automatic expiration</li>
                <li>Multi-factor authentication support</li>
                <li>Secure password policies and complexity requirements</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6">Role-Based Access</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Granular permissions for different user roles</li>
                <li>Admin and standard user access levels</li>
                <li>Data isolation between organizations</li>
                <li>Audit logs for all access and changes</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Database className="h-6 w-6 text-green-600" />
              Infrastructure Security
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>Our infrastructure is built with security as a foundation:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Cloud Security:</strong> Hosted on enterprise-grade cloud providers</li>
                <li><strong>Network Security:</strong> VPC isolation and security groups</li>
                <li><strong>Database Security:</strong> PostgreSQL with advanced security features</li>
                <li><strong>Backup Security:</strong> Encrypted, geographically distributed backups</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring and alerting</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Users className="h-6 w-6 text-green-600" />
              Compliance & Certifications
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>We maintain compliance with industry standards:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>SOC 2 Type II</strong> compliance for security controls</li>
                <li><strong>GDPR</strong> compliance for data protection</li>
                <li><strong>ISO 27001</strong> information security management</li>
                <li><strong>Regular audits</strong> by independent security firms</li>
                <li><strong>Penetration testing</strong> conducted quarterly</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-green-600" />
              Incident Response
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>We have comprehensive incident response procedures:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>24/7 monitoring</strong> for security events</li>
                <li><strong>Incident response team</strong> available around the clock</li>
                <li><strong>Transparent communication</strong> during security incidents</li>
                <li><strong>Post-incident analysis</strong> and improvement</li>
                <li><strong>Customer notification</strong> within required timeframes</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Third-Party Security</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We carefully vet all third-party services and vendors:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Security assessments of all vendors</li>
                <li>Data processing agreements with all partners</li>
                <li>Regular security reviews of third-party services</li>
                <li>Minimal data sharing with external services</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Security Responsibilities</h2>
            <div className="space-y-4 text-gray-700">
              <p>While we secure the platform, you play an important role:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use strong, unique access tokens</li>
                <li>Enable multi-factor authentication when available</li>
                <li>Report suspicious activity immediately</li>
                <li>Keep your contact information current</li>
                <li>Follow data handling best practices</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Updates</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We regularly update our security measures and will communicate
                important security information through our platform and email.
              </p>
              <p>
                For security-related questions or to report vulnerabilities,
                please contact us at{' '}
                <a href="mailto:security@eco-loom.com" className="text-green-600 hover:underline">security@eco-loom.com</a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}