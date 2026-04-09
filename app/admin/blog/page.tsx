"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Row = {
  id: string;
  title: string;
  category: string;
  status: string;
  featured: boolean;
  viewCount: number;
  updatedAt: string;
  slug: string;
};

export default function AdminBlogListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog", { credentials: "include" });
      const json = (await res.json()) as { data?: Row[] };
      if (res.ok && json.data) setRows(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/admin/blog/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) void load();
  };

  const togglePublish = async (r: Row) => {
    const next = r.status === "published" ? "draft" : "published";
    const res = await fetch(`/api/admin/blog/${r.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        next === "published"
          ? { status: "published" }
          : { status: "draft" },
      ),
    });
    if (res.ok) void load();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog Posts</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage articles for the public blog.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className={buttonVariants({ className: "inline-flex h-11 items-center" })}
        >
          <Plus className="mr-2 size-4" strokeWidth={1.5} />
          New Post
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All posts</CardTitle>
          <CardDescription>Title, status, featured flag, and views.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Title</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Featured</th>
                    <th className="pb-2 pr-4 font-medium">Views</th>
                    <th className="pb-2 pr-4 font-medium">Updated</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{r.title}</td>
                      <td className="py-3 pr-4">{r.category}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            r.status === "published"
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                              : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{r.featured ? "Yes" : "—"}</td>
                      <td className="py-3 pr-4">{r.viewCount}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(r.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/blog/${r.id}`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                              className: "inline-flex items-center",
                            })}
                          >
                            <Pencil className="mr-1 size-3.5" />
                            Edit
                          </Link>
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => void togglePublish(r)}
                          >
                            {r.status === "published" ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="text-destructive"
                            onClick={() => void remove(r.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
