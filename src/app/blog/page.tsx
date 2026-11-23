import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, ArrowRight, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { blogPosts as siteBlogPosts } from '@/lib/marketing/blog-posts';

type BlogPageProps = {
  searchParams: Promise<{ page?: string }>;
};

const POSTS_PER_PAGE = 10;

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { page: pageParam } = await searchParams;
  const blogPosts = siteBlogPosts.map((post, index) => ({
    id: index + 1,
    slug: post.slug,
    title: post.title,
    excerpt: post.summary,
    author: 'Eco-Loom Journal',
    date: post.date,
    readTime: post.readingTime,
    category: post.category,
    featured: index === 0,
  }));

  const categories = ['All', ...Array.from(new Set(blogPosts.map((post) => post.category)))];
  const totalPages = Math.ceil(blogPosts.length / POSTS_PER_PAGE);
  const requestedPage = Number.parseInt(pageParam ?? '1', 10);
  const currentPage = Math.min(
    Math.max(Number.isNaN(requestedPage) ? 1 : requestedPage, 1),
    totalPages
  );
  const pagePosts = blogPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );
  const featuredPost = pagePosts.find((post) => post.featured);
  const pagedPosts = pagePosts.filter((post) => !post.featured);

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
            Insights & perspectives
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
              The latest in
              <span className="block text-green-700">sustainability & climate tech</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-700 leading-relaxed">
              Stay informed with expert insights, industry trends, and practical advice
              on carbon accounting, sustainable operations, and climate action.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-white border-b border-green-100">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                className="px-4 py-2 text-sm font-medium rounded-full border border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Featured Article
              </span>
            </div>
            <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-8 lg:p-12">
              <article className="max-w-4xl">
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        {featuredPost.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {featuredPost.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {featuredPost.readTime}
                      </div>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                      {featuredPost.title}
                    </h2>
                    <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {featuredPost.author[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{featuredPost.author}</p>
                          <p className="text-sm text-gray-600">Author</p>
                        </div>
                      </div>
                      <Button asChild className="bg-green-600 hover:bg-green-700">
                        <Link href={`/blog/${featuredPost.slug}`}>
                          Read Article
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
              </article>
            </div>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section id="blog-posts" className="py-16 bg-linear-to-b from-white to-green-50">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pagedPosts.map((post) => (
              <article key={post.id} className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {post.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-xs">
                          {post.author[0]}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">{post.author}</span>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="text-green-600 hover:text-green-700 p-0 h-auto">
                      <Link href={`/blog/${post.slug}`}>Read more →</Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <nav aria-label="Blog pagination" className="bg-green-50 pb-16">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-6 lg:px-8">
          {currentPage > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/blog?page=${currentPage - 1}#blog-posts`} rel="prev">
                Previous
              </Link>
            </Button>
          )}
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <Button
              key={page}
              asChild
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
            >
              <Link
                href={`/blog?page=${page}#blog-posts`}
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`Page ${page}`}
              >
                {page}
              </Link>
            </Button>
          ))}
          {currentPage < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/blog?page=${currentPage + 1}#blog-posts`} rel="next">
                Next
              </Link>
            </Button>
          )}
          <span className="sr-only" aria-live="polite">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </nav>

      {/* Newsletter Signup */}
      <section className="py-20 lg:py-32 bg-green-600">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Stay in the loop
            </h2>
            <p className="text-lg text-green-100">
              Get the latest insights on sustainability, climate tech, and carbon accounting
              delivered to your inbox every month.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-600"
              />
              <Button className="bg-white text-green-600 hover:bg-green-50 px-6 py-3 font-semibold">
                Subscribe
              </Button>
            </div>
            <p className="text-sm text-green-200">
              No spam, ever. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
