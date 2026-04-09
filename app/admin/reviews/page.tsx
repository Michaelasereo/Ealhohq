"use client";

import { Loader2, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Review = {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorLocation: string | null;
  content: string;
  rating: number;
  isAnonymous: boolean;
  isApproved: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  source: string;
  createdAt: string;
};

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<"pending" | "published">("pending");
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [manualName, setManualName] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualRating, setManualRating] = useState(5);
  const [savingManual, setSavingManual] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?tab=${tab}`, {
        credentials: "include",
      });
      const json = (await res.json()) as { data?: Review[] };
      if (res.ok && json.data) setRows(json.data);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: string, action: string) => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) void load();
  };

  const submitManual = async () => {
    setSavingManual(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: manualName,
          authorRole: manualRole,
          authorLocation: manualLocation,
          content: manualContent,
          rating: manualRating,
        }),
      });
      if (res.ok) {
        setManualName("");
        setManualRole("");
        setManualLocation("");
        setManualContent("");
        setManualRating(5);
        setTab("published");
        void load();
      }
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Approve platform submissions and manage published testimonials.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={tab === "pending" ? "default" : "outline"}
          onClick={() => setTab("pending")}
        >
          Pending approval
        </Button>
        <Button
          type="button"
          variant={tab === "published" ? "default" : "outline"}
          onClick={() => setTab("published")}
        >
          Published
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add review manually</CardTitle>
          <CardDescription>
            Testimonials are always anonymous on the site. Names below are for your records only.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Internal label (not shown publicly)</Label>
            <Input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. WhatsApp — March intake"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>Profession (shown on site)</Label>
            <Input
              value={manualRole}
              onChange={(e) => setManualRole(e.target.value)}
              placeholder="e.g. Registered nurse"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>Location (shown on site)</Label>
            <Input
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="e.g. Lagos"
              className="h-11"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Rating (1–5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={manualRating}
              onChange={(e) => setManualRating(Number(e.target.value))}
              className="h-11 max-w-[120px]"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Content</Label>
            <textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              rows={4}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="button"
              disabled={
                savingManual ||
                manualContent.length < 10 ||
                !manualName.trim() ||
                !manualRole.trim() ||
                !manualLocation.trim()
              }
              onClick={() => void submitManual()}
            >
              {savingManual ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add review"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading…
        </div>
      ) : tab === "pending" ? (
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="size-4 fill-primary text-primary" strokeWidth={1.5} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground">{r.content}</p>
                <p className="text-xs text-muted-foreground">
                  {r.authorName}
                  {r.authorRole ? ` · ${r.authorRole}` : ""}
                  {r.authorLocation ? ` · ${r.authorLocation}` : ""} · {r.source}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!r.isApproved ? (
                    <Button
                      type="button"
                      onClick={() => void patch(r.id, "approve")}
                      className="bg-emerald-600 hover:bg-emerald-600/90"
                    >
                      Approve &amp; publish
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => void patch(r.id, "republish")}
                    >
                      Publish again
                    </Button>
                  )}
                  {r.isApproved ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void patch(r.id, r.isFeatured ? "unfeature" : "feature")}
                    >
                      {r.isFeatured ? "Unfeature" : "Feature"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void remove(r.id)}
                  >
                    <Trash2 className="mr-1 size-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending reviews.</p>
          ) : null}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Internal / role / location</th>
                    <th className="px-4 py-3 font-medium">Preview</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Featured</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="max-w-[200px] px-4 py-3 align-top text-xs">
                        <span className="font-medium">{r.authorName}</span>
                        {r.authorRole ? (
                          <>
                            <br />
                            <span className="text-muted-foreground">{r.authorRole}</span>
                          </>
                        ) : null}
                        {r.authorLocation ? (
                          <>
                            <br />
                            <span className="text-muted-foreground">{r.authorLocation}</span>
                          </>
                        ) : null}
                      </td>
                      <td className="max-w-xs px-4 py-3 align-top text-muted-foreground">
                        {r.content.slice(0, 120)}
                        {r.content.length > 120 ? "…" : ""}
                      </td>
                      <td className="px-4 py-3 align-top">{r.rating}</td>
                      <td className="px-4 py-3 align-top">{r.isFeatured ? "Yes" : "—"}</td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() =>
                              void patch(r.id, r.isFeatured ? "unfeature" : "feature")
                            }
                          >
                            Toggle featured
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => void patch(r.id, "unpublish")}
                          >
                            Unpublish
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="text-destructive"
                            onClick={() => void remove(r.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No published reviews.</p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
