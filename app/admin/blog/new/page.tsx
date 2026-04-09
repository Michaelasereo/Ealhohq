import Link from "next/link";

import { BlogPostEditor } from "@/components/admin/BlogPostEditor";

export default function AdminBlogNewPage() {
  return (
    <div>
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <Link
          href="/admin/blog"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Blog posts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New post</h1>
      </div>
      <BlogPostEditor />
    </div>
  );
}
