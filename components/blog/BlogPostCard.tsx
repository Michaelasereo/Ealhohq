import Link from "next/link";

import { cn } from "@/lib/utils";

const brandPill =
  "inline-flex w-fit items-center rounded-full border border-primary/30 bg-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary";

export type BlogCardPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  category: string;
  author: string;
  readingTime: number;
  publishedAt: Date | null;
};

export function BlogPostCard({ post }: { post: BlogCardPost }) {
  const date =
    post.publishedAt != null
      ? new Intl.DateTimeFormat("en-NG", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(post.publishedAt)
      : "";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#dddbd0] bg-white shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
    >
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className={brandPill}>
          {post.category}
        </span>
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-[#24221e]">
          {post.title}
        </h2>
        <p className="line-clamp-2 text-sm text-[#5c574e]">{post.excerpt}</p>
        <div
          className={cn(
            "mt-auto flex flex-wrap items-center gap-1 text-xs text-[#807a5a]",
          )}
        >
          <span>{post.author}</span>
          <span aria-hidden>·</span>
          <span>{post.readingTime} min read</span>
          {date ? (
            <>
              <span aria-hidden>·</span>
              <span>{date}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
