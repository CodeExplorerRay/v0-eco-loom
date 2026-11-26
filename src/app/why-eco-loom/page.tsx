import type { Metadata } from 'next';
import { ProductDetailPage } from '@/components/product-detail-page';
import { productBenefits } from '@/lib/marketing/product-content';

export const metadata: Metadata = {
  title: 'Why Choose Eco-Loom',
  description:
    'Learn how Eco-Loom makes sustainability tracking easier to start, transparent to review, and practical to act on.',
  alternates: { canonical: '/why-eco-loom' },
};

export default function WhyEcoLoomPage() {
  return (
    <ProductDetailPage
      description="Eco-Loom gives teams a clear, usable way to organize carbon data and connect it to the work that reduces impact."
      eyebrow="Why Eco-Loom"
      items={productBenefits}
      itemsHeading="Built for useful sustainability work"
      title="A clearer way to understand and improve your footprint"
    />
  );
}
