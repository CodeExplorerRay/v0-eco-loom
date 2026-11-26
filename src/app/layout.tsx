import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  metadataBase: new URL("https://eco-loom-esg.vercel.app"),
  title: {
    default: "Eco-Loom | Carbon Accounting & ESG Operations",
    template: "%s | Eco-Loom",
  },
  description: "Eco-Loom helps sustainability teams manage emissions data, carbon accounting, goals, and ESG reporting in one operational workspace.",
  keywords: ["Eco-Loom", "ESG", "carbon accounting", "emissions tracking", "sustainability reporting", "carbon ledger"],
  authors: [{ name: "Eco-Loom" }],
  alternates: { canonical: "/" },
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Eco-Loom | Carbon Accounting & ESG Operations",
    description: "Manage emissions data, carbon accounting, goals, and ESG reporting in one operational workspace.",
    url: "https://eco-loom-esg.vercel.app/",
    siteName: "Eco-Loom",
    type: "website",
    images: [{ url: "/eco-loom-og.webp", width: 1424, height: 752, alt: "Eco-Loom carbon accounting and ESG operations" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eco-Loom | Carbon Accounting & ESG Operations",
    description: "Manage emissions data, carbon accounting, goals, and ESG reporting in one workspace.",
    images: ["/eco-loom-og.webp"],
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://eco-loom-esg.vercel.app/#organization',
      name: 'Eco-Loom',
      url: 'https://eco-loom-esg.vercel.app/',
      logo: 'https://eco-loom-esg.vercel.app/logo.svg',
      description:
        'Eco-Loom helps sustainability teams manage emissions data, carbon accounting, goals, and ESG reporting.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://eco-loom-esg.vercel.app/#website',
      name: 'Eco-Loom',
      url: 'https://eco-loom-esg.vercel.app/',
      publisher: { '@id': 'https://eco-loom-esg.vercel.app/#organization' },
      inLanguage: 'en',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2731444187834560"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="antialiased bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
