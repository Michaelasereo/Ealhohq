import Link from "next/link";

import { cn } from "@/lib/utils";

import type { BlogCardPost } from "./BlogPostCard";

const brandPill =
  "inline-flex w-fit items-center rounded-full border border-primary/30 bg-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary";

export function BlogFeaturedCard({ post }: { post: BlogCardPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#dddbd0] bg-white shadow-sm transition-all hover:border-primary/20 hover:shadow-md md:flex-row"
    >
      <div className="flex flex-1 flex-col justify-center gap-3 p-6 sm:p-8">
        <span className={brandPill}>
          {post.category}
        </span>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-[#24221e] sm:text-3xl">
          {post.title}
        </h2>
        <p className="text-base leading-relaxed text-[#5c574e]">{post.excerpt}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#807a5a]">
          <span>{post.author}</span>
          <span aria-hidden>·</span>
          <span>{post.readingTime} min read</span>
        </div>
        <span
          className={cn(
            "mt-2 inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary",
          )}
        >
          Read article →
        </span>
      </div>
    </Link>
  );
}
