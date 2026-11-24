import type { Metadata } from 'next';
import { ProductDetailPage } from '@/components/product-detail-page';
import { productWorkflowSteps } from '@/lib/marketing/product-content';

export const metadata: Metadata = {
  title: 'How It Works | Eco-Loom',
  description:
    'See how Eco-Loom helps teams load emissions data, understand their footprint, and report progress.',
};

export default function HowItWorksPage() {
  return (
    <ProductDetailPage
      description="Move from scattered source records to a useful emissions workflow: bring data together, see what it means, and share the results."
      eyebrow="How it works"
      items={productWorkflowSteps}
      itemsHeading="Three steps to clarity"
      title="Turn emissions data into practical action"
    />
  );
}
