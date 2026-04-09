import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";
import { prisma } from "@/lib/prisma/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const staticPages = [
    { url: baseUrl, priority: 1.0 },
    { url: `${baseUrl}/book`, priority: 0.9 },
    { url: `${baseUrl}/blog`, priority: 0.8 },
    { url: `${baseUrl}/burnout-assessment`, priority: 0.8 },
    { url: `${baseUrl}/organizations`, priority: 0.7 },
    { url: `${baseUrl}/for-organisations`, priority: 0.7 },
    { url: `${baseUrl}/privacy`, priority: 0.3 },
    { url: `${baseUrl}/terms`, priority: 0.3 },
    { url: `${baseUrl}/therapist-standards`, priority: 0.5 },
  ].map((page) => ({
    url: page.url,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: page.priority,
  }));

  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    });
    blogPages = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    /* Build or DB unavailable — ship static URLs only */
  }

  return [...staticPages, ...blogPages];
}
