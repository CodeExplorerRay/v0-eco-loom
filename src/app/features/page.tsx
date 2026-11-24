import type { Metadata } from 'next';
import { ProductDetailPage } from '@/components/product-detail-page';
import { productFeatures } from '@/lib/marketing/product-content';

export const metadata: Metadata = {
  title: 'Features | Eco-Loom',
  description:
    'Explore Eco-Loom features for emissions data intake, dashboards, stakeholder reporting, and progress tracking.',
};

export default function FeaturesPage() {
  return (
    <ProductDetailPage
      description="Keep the everyday work of carbon accounting connected, from the first source document to the next reporting decision."
      eyebrow="Features"
      items={productFeatures}
      itemsHeading="Tools for the full reporting workflow"
      title="Everything your team needs to move sustainability work forward"
    />
  );
}
