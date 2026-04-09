import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { BlogListingClient } from "@/components/blog/BlogListingClient";
import { Navbar } from "@/components/landing/Navbar";
import type { BlogCardPost } from "@/components/blog/BlogPostCard";
import { getSiteUrl } from "@/lib/site-url";
import { prisma } from "@/lib/prisma/client";

export const revalidate = 300;

const cardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  category: true,
  author: true,
  readingTime: true,
  publishedAt: true,
} as const;

export const metadata: Metadata = {
  title: "Mental Health Insights | Ealho Therapy Blog",
  description:
    "Evidence-based articles on mental health, burnout, and therapy for Nigerian healthcare professionals.",
  openGraph: {
    title: "Mental Health Insights | Ealho Therapy",
    description:
      "Evidence-based articles on mental health for Nigerian healthcare professionals.",
    type: "website",
    url: `${getSiteUrl()}/blog`,
  },
  alternates: {
    canonical: `${getSiteUrl()}/blog`,
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const rawCat = sp.category ?? "All";
  const category = rawCat === "All" ? "All" : rawCat;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 10;
  const search = sp.search?.trim();

  const baseWhere: Prisma.BlogPostWhereInput = {
    status: "published",
    ...(category !== "All" ? { category } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { excerpt: { contains: search, mode: "insensitive" } },
            { tags: { has: search } },
          ],
        }
      : {}),
  };

  const showFeatured =
    page === 1 && category === "All" && !search;

  const featured = showFeatured
    ? await prisma.blogPost.findFirst({
        where: { status: "published", featured: true },
        orderBy: { publishedAt: "desc" },
        select: cardSelect,
      })
    : null;

  const gridWhere = {
    ...baseWhere,
    ...(featured ? { NOT: { id: featured.id } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: gridWhere,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: cardSelect,
    }),
    prisma.blogPost.count({ where: gridWhere }),
  ]);

  const mapPost = (p: (typeof rows)[number]): BlogCardPost => ({
    ...p,
    publishedAt: p.publishedAt,
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="border-b border-[#dddbd0] bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[1200px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#807a5a]">
            Insights
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#24221e] sm:text-4xl">
            Mental health insights for those who heal.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#5c574e] sm:text-lg">
            Evidence-based articles written for Nigerian healthcare professionals. No jargon. No
            judgment.
          </p>
        </div>
      </div>

      <BlogListingClient
        featured={featured ? mapPost(featured) : null}
        posts={rows.map(mapPost)}
        total={total}
        page={page}
        limit={limit}
        category={category}
      />
    </div>
  );
}
