import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/marketing/blog-posts";

const siteUrl = "https://eco-loom-esg.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    '',
    '/about',
    '/features',
    '/how-it-works',
    '/why-eco-loom',
    '/pricing',
    '/contact',
    '/privacy',
    '/terms',
    '/security',
    '/blog',
  ];

  return [
    ...publicRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      changeFrequency: route === '/blog' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route === '/blog' ? 0.8 : 0.6,
    })),
    ...blogPosts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
