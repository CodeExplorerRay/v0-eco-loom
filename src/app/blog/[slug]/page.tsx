import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { blogPosts, getBlogPost } from '@/lib/marketing/blog-posts';

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: 'Blog | Eco-Loom',
    };
  }

  return {
    title: `${post.title} | Eco-Loom`,
    description: post.summary,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-green-50 to-emerald-50 pt-32 pb-20 text-gray-900">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 12%, rgba(74, 222, 128, 0.14), transparent 22%), radial-gradient(circle at 88% 8%, rgba(190, 242, 100, 0.16), transparent 20%), linear-gradient(rgba(21, 128, 61, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(21, 128, 61, 0.05) 1px, transparent 1px)',
            backgroundSize: 'auto, auto, 84px 84px, 84px 84px',
          }}
        />

        <article className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="mb-10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 transition hover:text-green-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to blog
            </Link>
          </div>

          <header className="mb-12 space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
              <span>{post.category}</span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Clock3 className="h-3.5 w-3.5" />
                {post.date}
              </span>
              <span className="text-gray-500">{post.readingTime}</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 lg:text-5xl">
              {post.title}
            </h1>
            <p className="text-lg font-medium leading-8 text-gray-700">{post.lead}</p>
            <div className="border-y border-green-100 py-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green-700">
                Best for
              </p>
              <p className="mt-2 text-base font-medium leading-7 text-gray-700">{post.audience}</p>
              <p className="mt-4 text-base font-semibold leading-7 text-gray-900">
                {post.takeaway}
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-3xl space-y-12">
            {post.sections.map((section) => (
              <section key={section.title} className="border-t border-green-100 pt-8 first:border-t-0 first:pt-0">
                <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                <div className="mt-5 space-y-5 text-[15px] font-medium leading-8 text-gray-700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mx-auto mt-14 max-w-3xl border-t border-green-100 pt-10">
            <h2 className="text-2xl font-bold text-gray-900">What this means for your team</h2>
            <p className="mt-4 text-[15px] font-medium leading-8 text-gray-700">
              {post.engagement.prompt}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-green-600 text-white hover:bg-green-700">
                <Link href={post.engagement.primaryHref}>{post.engagement.primaryLabel}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50"
              >
                <Link href={post.engagement.secondaryHref}>
                  {post.engagement.secondaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
