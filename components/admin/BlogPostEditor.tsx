"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BLOG_CATEGORIES } from "@/lib/blog-categories";
import { getSiteUrl } from "@/lib/site-url";
import { estimateReadingMinutes, slugifyTitle } from "@/lib/slugify";
import { cn } from "@/lib/utils";

const CATEGORIES = BLOG_CATEGORIES.filter((c) => c !== "All");

type PostPayload = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  author: string;
  authorRole: string;
  authorPhoto: string | null;
  readingTime: number;
  featured: boolean;
  status: string;
  metaTitle: string | null;
  metaDesc: string | null;
  publishedAt: string | null;
};

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after = "",
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const next = `${textarea.value.slice(0, start)}${before}${selected}${after}${textarea.value.slice(end)}`;
  textarea.value = next;
  const pos = start + before.length + selected.length + after.length;
  textarea.focus();
  textarea.setSelectionRange(pos, pos);
}

export function BlogPostEditor({ postId }: { postId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"content" | "seo">("content");

  const [id, setId] = useState<string | undefined>(postId);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState("Mental Health");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [author, setAuthor] = useState("Ealho Team");
  const [authorRole, setAuthorRole] = useState("Editorial Team");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");

  const readingTime = useMemo(() => estimateReadingMinutes(content), [content]);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { credentials: "include" });
      const json = (await res.json()) as { data?: PostPayload };
      if (!res.ok || !json.data) return;
      const p = json.data;
      setId(p.id);
      setTitle(p.title);
      setSlug(p.slug);
      setSlugManual(true);
      setExcerpt(p.excerpt);
      setContent(p.content);
      setCoverImage(p.coverImage ?? "");
      setCategory(p.category);
      setTags(p.tags ?? []);
      setAuthor(p.author);
      setAuthorRole(p.authorRole);
      setFeatured(p.featured);
      setStatus(p.status === "published" ? "published" : "draft");
      setMetaTitle(p.metaTitle ?? "");
      setMetaDesc(p.metaDesc ?? "");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (slugManual) return;
    setSlug(slugifyTitle(title));
  }, [title, slugManual]);

  const payload = useCallback(() => {
    return {
      title,
      slug,
      excerpt,
      content,
      coverImage: coverImage.trim() === "" ? null : coverImage.trim(),
      category,
      tags,
      author,
      authorRole,
      readingTime,
      featured,
      status,
      metaTitle: metaTitle.trim() === "" ? null : metaTitle.trim(),
      metaDesc: metaDesc.trim() === "" ? null : metaDesc.trim(),
    };
  }, [
    title,
    slug,
    excerpt,
    content,
    coverImage,
    category,
    tags,
    author,
    authorRole,
    readingTime,
    featured,
    status,
    metaTitle,
    metaDesc,
  ]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...payload() };
      if (id && status === "published") {
        delete body.status;
      } else {
        body.status = "draft";
      }
      if (id) {
        const res = await fetch(`/api/admin/blog/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) setDirty(false);
      } else {
        const res = await fetch("/api/admin/blog", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            slug: (body.slug as string) || slugifyTitle(title),
            status: "draft",
          }),
        });
        const json = (await res.json()) as { data?: { id: string } };
        if (res.ok && json.data?.id) {
          setId(json.data.id);
          setDirty(false);
          router.replace(`/admin/blog/${json.data.id}`);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [id, payload, router, status, title]);

  const publish = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        ...payload(),
        status: "published" as const,
      };
      if (id) {
        const res = await fetch(`/api/admin/blog/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setStatus("published");
          setDirty(false);
        }
      } else {
        const res = await fetch("/api/admin/blog", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            slug: body.slug || slugifyTitle(title),
          }),
        });
        const json = (await res.json()) as { data?: { id: string } };
        if (res.ok && json.data?.id) {
          setId(json.data.id);
          setStatus("published");
          setDirty(false);
          router.replace(`/admin/blog/${json.data.id}`);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [id, payload, router, title]);

  const unpublish = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (res.ok) {
        setStatus("draft");
        setDirty(false);
      }
    } finally {
      setSaving(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id || !dirty) return;
    const t = setInterval(() => {
      void saveDraft();
    }, 60000);
    return () => clearInterval(t);
  }, [id, dirty, saveDraft]);

  const onField = (fn: () => void) => {
    fn();
    setDirty(true);
  };

  const baseUrl = getSiteUrl();

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("content")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              tab === "content" ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            Content
          </button>
          <button
            type="button"
            onClick={() => setTab("seo")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              tab === "seo" ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            SEO
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => void saveDraft()}>
            Save draft
          </Button>
          {status === "draft" ? (
            <Button type="button" disabled={saving} onClick={() => void publish()}>
              Publish
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void unpublish()}>
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {tab === "content" ? (
        <Card>
          <CardHeader>
            <CardTitle>Article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => onField(() => setTitle(e.target.value))}
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  onField(() => setSlug(e.target.value));
                }}
                className="h-12 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Preview: {baseUrl}/blog/{slug || "your-slug"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt ({excerpt.length} chars)</Label>
              <textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => onField(() => setExcerpt(e.target.value))}
                rows={3}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={category}
                  onChange={(e) => onField(() => setCategory(e.target.value))}
                  className="border-input bg-background h-12 w-full rounded-md border px-3 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Reading time (auto {readingTime} min)</Label>
                <Input readOnly value={String(readingTime)} className="h-12 bg-muted/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (press Enter)</Label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const v = tagInput.trim();
                  if (!v) return;
                  onField(() => {
                    setTags((t) => (t.includes(v) ? t : [...t, v]));
                    setTagInput("");
                  });
                }}
                className="h-12"
                placeholder="burnout"
              />
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      onField(() => setTags((prev) => prev.filter((x) => x !== t)))
                    }
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                  >
                    {t} ×
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => onField(() => setAuthor(e.target.value))}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorRole">Author role</Label>
                <Input
                  id="authorRole"
                  value={authorRole}
                  onChange={(e) => onField(() => setAuthorRole(e.target.value))}
                  className="h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover">Cover image URL</Label>
              <Input
                id="cover"
                value={coverImage}
                onChange={(e) => onField(() => setCoverImage(e.target.value))}
                className="h-12"
                placeholder="https://"
              />
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin arbitrary URL preview
                <img
                  src={coverImage}
                  alt=""
                  className="mt-2 max-h-48 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="featured"
                type="checkbox"
                checked={featured}
                onChange={(e) => onField(() => setFeatured(e.target.checked))}
                className="size-4"
              />
              <Label htmlFor="featured">Featured</Label>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["H2", "## ", "\n"],
                    ["H3", "### ", "\n"],
                    ["Bold", "**", "**"],
                    ["Italic", "_", "_"],
                    ["Link", "[", "](url)"],
                    [">", "> ", "\n"],
                    ["List", "- ", "\n"],
                  ] as const
                ).map(([label, before, after]) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      const ta = document.getElementById("content-md") as HTMLTextAreaElement | null;
                      if (!ta) return;
                      insertAtCursor(ta, before, after);
                      setContent(ta.value);
                      setDirty(true);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Label htmlFor="content-md">Content (Markdown)</Label>
              <textarea
                id="content-md"
                value={content}
                onChange={(e) => onField(() => setContent(e.target.value))}
                rows={22}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[320px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
              <p className="text-xs text-muted-foreground">
                {content.trim().split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta title ({metaTitle.length}/60)</Label>
              <Input
                id="metaTitle"
                maxLength={60}
                value={metaTitle}
                onChange={(e) => onField(() => setMetaTitle(e.target.value))}
                placeholder={title}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaDesc">Meta description ({metaDesc.length}/160)</Label>
              <textarea
                id="metaDesc"
                maxLength={160}
                value={metaDesc}
                onChange={(e) => onField(() => setMetaDesc(e.target.value))}
                placeholder={excerpt}
                rows={4}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground">Search preview</p>
              <p className="mt-2 text-lg text-blue-700">
                {metaTitle || title || "Page title"}
              </p>
              <p className="text-sm text-emerald-700">
                {baseUrl}/blog/{slug || "slug"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {metaDesc || excerpt || "Description will appear here."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Autosaves draft every 60 seconds when editing an existing post and there are unsaved changes.
      </p>
    </div>
  );
}
