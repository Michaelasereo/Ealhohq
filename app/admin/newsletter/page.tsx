"use client";

import { Loader2, Mail, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Subscriber = {
  id: string;
  name: string | null;
  email: string;
  isAnonymous: boolean;
  sequence: number;
  source: string;
  unsubscribed: boolean;
  createdAt: string;
};

type ApiData = {
  stats: { total: number; active: number; unsubscribed: number; avgSequence: number };
  subscribers: Subscriber[];
  sends: {
    id: string;
    subject: string;
    sentCount: number;
    sentBy: string | null;
    createdAt: string;
  }[];
  page: number;
  limit: number;
};

export default function NewsletterAdminPage() {
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [tab, setTab] = useState<"subscribers" | "send">("subscribers");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiData | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      const res = await fetch(`/api/admin/newsletter?${q.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { data?: ApiData };
      if (res.ok && json.data) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const recipientCount = data?.stats.active ?? 0;

  const csvHref = useMemo(() => {
    if (!data?.subscribers?.length) return "";
    const header = "email,name,isAnonymous,sequence,source,createdAt,unsubscribed";
    const rows = data.subscribers.map((s) =>
      [
        s.email,
        s.name ?? "",
        String(s.isAnonymous),
        String(s.sequence),
        s.source,
        new Date(s.createdAt).toISOString(),
        String(s.unsubscribed),
      ]
        .map((v) => `\"${String(v).replaceAll("\"", "\"\"")}\"`)
        .join(","),
    );
    return `data:text/csv;charset=utf-8,${encodeURIComponent([header, ...rows].join("\n"))}`;
  }, [data?.subscribers]);

  async function action(id: string, actionName: "advance" | "reset" | "remove") {
    const res = await fetch(`/api/admin/newsletter/subscribers/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    if (res.ok) void load();
  }

  async function sendNewsletter() {
    if (!subject.trim() || !body.trim()) return;
    if (!confirm(`Send to ${recipientCount} subscribers? This cannot be undone.`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body }),
      });
      const json = (await res.json()) as { sentCount?: number; error?: string };
      if (!res.ok) {
        alert(json.error ?? "Failed to send");
      } else {
        alert(`Newsletter sent to ${json.sentCount ?? 0} subscribers.`);
      }
    } finally {
      setSending(false);
    }
  }

  function insertToken(before: string, after = "") {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => `${b}${before}${after}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Mail className="size-5" />
        <h1 className="text-2xl font-semibold">Newsletter</h1>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "subscribers" ? "default" : "outline"} onClick={() => setTab("subscribers")}>Subscribers</Button>
        <Button variant={tab === "send" ? "default" : "outline"} onClick={() => setTab("send")}>Send Newsletter</Button>
      </div>

      {tab === "subscribers" ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="Total" value={String(data?.stats.total ?? 0)} />
            <StatCard title="Active" value={String(data?.stats.active ?? 0)} />
            <StatCard title="Unsubscribed" value={String(data?.stats.unsubscribed ?? 0)} />
            <StatCard title="Avg sequence" value={(data?.stats.avgSequence ?? 0).toFixed(1)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscribers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by email"
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => void load()}>Search</Button>
                {csvHref ? (
                  <a href={csvHref} download="subscribers.csv">
                    <Button variant="outline">Export CSV</Button>
                  </a>
                ) : null}
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-2 py-2">Email</th>
                        <th className="px-2 py-2">Name</th>
                        <th className="px-2 py-2">Anonymous</th>
                        <th className="px-2 py-2">Sequence</th>
                        <th className="px-2 py-2">Source</th>
                        <th className="px-2 py-2">Joined</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.subscribers.map((s) => (
                        <tr key={s.id} className="border-b">
                          <td className="px-2 py-2">{s.email}</td>
                          <td className="px-2 py-2">{s.name ?? "—"}</td>
                          <td className="px-2 py-2">{s.isAnonymous ? "Yes" : "No"}</td>
                          <td className="px-2 py-2">{s.sequence}</td>
                          <td className="px-2 py-2">{s.source}</td>
                          <td className="px-2 py-2">{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td className="px-2 py-2">
                            <span className={s.unsubscribed ? "text-gray-500" : "text-emerald-700"}>
                              {s.unsubscribed ? "Unsubscribed" : "Active"}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => void action(s.id, "advance")}>Advance</Button>
                              <Button variant="outline" size="sm" onClick={() => void action(s.id, "reset")}>Reset</Button>
                              <Button variant="ghost" size="sm" onClick={() => void action(s.id, "remove")} className="text-destructive">Remove</Button>
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
        </>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send newsletter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject line</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Body (HTML)</label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => insertToken("<strong>", "</strong>")}>
                    Bold
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertToken("<em>", "</em>")}>
                    Italic
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertToken('<a href=\"https://\">', "</a>")}
                  >
                    Link
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertToken("<p></p>\n")}>
                    Paragraph break
                  </Button>
                </div>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={14}
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="text-sm text-muted-foreground">Will send to {recipientCount} active subscribers</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(true)}>Preview</Button>
                <Button onClick={() => void sendNewsletter()} disabled={sending || !subject.trim() || !body.trim()}>
                  {sending ? <><Loader2 className="mr-2 size-4 animate-spin" />Sending...</> : "Send Newsletter"}
                </Button>
              </div>

              {previewOpen ? (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-medium">Preview</p>
                    <Button size="sm" variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Button>
                  </div>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: body }} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent newsletter sends</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.sends?.length ? (
                <p className="text-sm text-muted-foreground">No newsletter sends yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-2 py-2">Subject</th>
                        <th className="px-2 py-2">Sent count</th>
                        <th className="px-2 py-2">Sent by</th>
                        <th className="px-2 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sends.map((s) => (
                        <tr key={s.id} className="border-b">
                          <td className="px-2 py-2">{s.subject}</td>
                          <td className="px-2 py-2">{s.sentCount}</td>
                          <td className="px-2 py-2">{s.sentBy ?? "—"}</td>
                          <td className="px-2 py-2">{new Date(s.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
