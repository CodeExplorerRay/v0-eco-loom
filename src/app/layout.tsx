import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Eco-Loom | Autonomous ESG Operations",
  description: "Eco-Loom is an ESG command center for carbon ledger operations, AI-assisted reporting, goal tracking, and Notion-connected compliance workflows.",
  keywords: ["Eco-Loom", "ESG", "carbon ledger", "sustainability reporting", "Notion sync", "compliance dashboard"],
  authors: [{ name: "Eco-Loom" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Eco-Loom",
    description: "Run carbon data ingestion, gap analysis, reporting, and workspace sync from one ESG operations platform.",
    url: "https://eco-loom.local",
    siteName: "Eco-Loom",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eco-Loom",
    description: "Autonomous ESG operations for ingestion, carbon accounting, reporting, and sync.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
