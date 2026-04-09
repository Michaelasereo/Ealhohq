"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BLOG_CATEGORIES } from "@/lib/blog-categories";
import { cn } from "@/lib/utils";

import { BlogFeaturedCard } from "./BlogFeaturedCard";
import { BlogPostCard, type BlogCardPost } from "./BlogPostCard";

type Props = {
  featured: BlogCardPost | null;
  posts: BlogCardPost[];
  total: number;
  page: number;
  limit: number;
  category: string;
};

export function BlogListingClient({
  featured,
  posts,
  total,
  page,
  limit,
  category,
}: Props) {
  const searchParams = useSearchParams();
  const search = searchParams.get("search")?.trim() ?? "";

  const buildHref = (next: { cat?: string; page?: number }) => {
    const p = new URLSearchParams();
    const cat = next.cat ?? category;
    const pg = next.page ?? 1;
    if (cat && cat !== "All") p.set("category", cat);
    if (pg > 1) p.set("page", String(pg));
    if (search) p.set("search", search);
    const q = p.toString();
    return q ? `/blog?${q}` : "/blog";
  };

  const remaining = Math.max(0, total - page * limit);
  const hasMore = remaining > 0;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-6 sm:px-6">
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BLOG_CATEGORIES.map((cat) => {
          const active = category === cat || (cat === "All" && category === "All");
          return (
            <Link
              key={cat}
              href={buildHref({ cat, page: 1 })}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/30 bg-white text-primary hover:bg-primary/5",
              )}
            >
              {cat}
            </Link>
          );
        })}
      </div>

      {featured && page === 1 && category === "All" && !search ? (
        <div className="mb-12">
          <BlogFeaturedCard post={featured} />
        </div>
      ) : null}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dddbd0] bg-white px-6 py-16 text-center">
          <p className="text-lg font-medium text-[#24221e]">No articles found.</p>
          <p className="mt-2 text-sm text-[#5c574e]">
            We are working on more content. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="mt-12 flex justify-center">
          <Link
            href={buildHref({ page: page + 1 })}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary/30 bg-white px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            Load more articles
            {remaining > 0 ? (
              <span className="ml-2 text-[#807a5a]">
                (Load {Math.min(remaining, limit)} more)
              </span>
            ) : null}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
