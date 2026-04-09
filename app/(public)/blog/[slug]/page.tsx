import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { after } from "next/server";

import { BookSessionCtaButton } from "@/components/blog/BookSessionCtaButton";
import { BlogHelpful } from "@/components/blog/BlogHelpful";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { BlogPostCard, type BlogCardPost } from "@/components/blog/BlogPostCard";
import { BlogShareBar } from "@/components/blog/BlogShareBar";
import { Navbar } from "@/components/landing/Navbar";
import { getSiteUrl } from "@/lib/site-url";
import { prisma } from "@/lib/prisma/client";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: "published" },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  const base = getSiteUrl();
  if (!post) {
    return { title: "Article not found | Ealho Therapy" };
  }
  const title = post.metaTitle ?? `${post.title} | Ealho Therapy`;
  const description = post.metaDesc ?? post.excerpt;
  const ogImages = post.coverImage
    ? [{ url: post.coverImage, alt: post.title }]
    : [{ url: `${base}/favicon-ealho.png`, alt: "Ealho Therapy" }];

  return {
    title,
    description,
    openGraph: {
      title: post.metaTitle ?? post.title,
      description,
      type: "article",
      url: `${base}/blog/${post.slug}`,
      images: ogImages,
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author],
    },
    alternates: {
      canonical: `${base}/blog/${post.slug}`,
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-white px-4 py-20 text-center">
        <Navbar />
        <p className="text-lg text-[#5c574e]">Article not found.</p>
        <Link href="/blog" className="mt-4 inline-block text-primary underline">
          Back to blog
        </Link>
      </div>
    );
  }

  after(async () => {
    try {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });
    } catch {
      /* ignore */
    }
  });

  const base = getSiteUrl();
  const date =
    post.publishedAt != null
      ? new Intl.DateTimeFormat("en-NG", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(post.publishedAt)
      : "";

  const related = await prisma.blogPost.findMany({
    where: {
      status: "published",
      category: post.category,
      NOT: { id: post.id },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      category: true,
      author: true,
      readingTime: true,
      publishedAt: true,
    },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Ealho Therapy",
      url: base,
    },
    datePublished: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: post.coverImage ?? `${base}/favicon-ealho.png`,
    url: `${base}/blog/${post.slug}`,
  };

  const mapCard = (p: (typeof related)[number]): BlogCardPost => ({
    ...p,
    publishedAt: p.publishedAt,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-white">
        <Navbar />
        <article className="mx-auto max-w-[1200px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          >
            ← Blog
          </Link>

          <header className="mx-auto mt-6 max-w-2xl">
            <span className="inline-flex rounded-full border border-primary/30 bg-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              {post.category}
            </span>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#24221e] sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[#5c574e]">{post.excerpt}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm text-[#807a5a]">
              <span>{post.author}</span>
              <span aria-hidden>·</span>
              {date ? <span>{date}</span> : null}
              {date ? <span aria-hidden>·</span> : null}
              <span>{post.readingTime} min read</span>
            </div>
            <div className="mt-8 border-t border-[#dddbd0]" />
          </header>

          {post.coverImage ? (
            <div className="relative mx-auto mt-10 max-h-96 w-full max-w-4xl overflow-hidden rounded-xl">
              <Image
                src={post.coverImage}
                alt=""
                width={1200}
                height={630}
                unoptimized
                className="h-auto max-h-96 w-full object-cover"
                priority
              />
            </div>
          ) : null}

          <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-10 lg:flex-row lg:gap-12">
            <aside className="lg:w-40 lg:shrink-0">
              <BlogShareBar slug={post.slug} title={post.title} />
            </aside>
            <div className="min-w-0 flex-1">
              <div className="mx-auto max-w-2xl">
                <MarkdownBody content={post.content} />
              </div>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-2xl space-y-8">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
            <BlogHelpful slug={post.slug} />
            <div className="border-t border-[#dddbd0]" />
          </div>

          {related.length > 0 ? (
            <section className="mx-auto mt-16 max-w-[1200px]">
              <h2 className="text-lg font-semibold text-[#24221e]">More from Ealho</h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <BlogPostCard key={r.id} post={mapCard(r)} />
                ))}
              </div>
            </section>
          ) : null}

          <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-[#dddbd0] bg-[#e8e6dd]/50 p-6 text-center sm:p-8">
            <p className="text-lg font-semibold text-[#24221e]">Ready to talk to someone?</p>
            <p className="mt-2 text-sm text-[#5c574e]">
              Licensed therapists available today.
            </p>
            <BookSessionCtaButton className="mt-6" />
          </div>
        </article>
      </div>
    </>
  );
}
