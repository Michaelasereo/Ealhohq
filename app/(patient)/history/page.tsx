"use client";

import { ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatWAT } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";

type HistoryItem = {
  id: string;
  dateIso: string;
  status: string;
  sessionType: string;
  therapist: { id: string; name: string };
  sessionNumber: number | null;
  durationMins: number;
  feedbackSubmitted: boolean;
};

type HistoryPageData = {
  items: HistoryItem[];
  page: number;
  hasMore: boolean;
  totalFiltered: number;
};

function buildParams(
  page: number,
  dateFrom: string,
  dateTo: string,
  search: string,
) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("limit", "10");
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  if (search.trim()) p.set("search", search.trim());
  return p;
}

async function fetchHistoryPage(
  page: number,
  dateFrom: string,
  dateTo: string,
  search: string,
): Promise<HistoryPageData> {
  const r = await fetch(
    `/api/patient/history?${buildParams(page, dateFrom, dateTo, search).toString()}`,
    { credentials: "include" },
  );
  const j = (await r.json()) as {
    success?: boolean;
    data?: HistoryPageData;
    error?: string;
  };
  if (!r.ok) throw new Error(j.error ?? "Failed to load");
  return j.data!;
}

export default function PatientHistoryPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const filterKey = useMemo(
    () => `${dateFrom}|${dateTo}|${search}`,
    [dateFrom, dateTo, search],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["patient-history", filterKey],
    queryFn: ({ pageParam }) =>
      fetchHistoryPage(pageParam, dateFrom, dateTo, search),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data?.pages],
  );

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setSearch("");
  }

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 p-4 pb-24 md:pb-8">
      <header>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-muted-foreground">
          Completed and cancelled sessions (WAT).
        </p>
      </header>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-h-12"
              />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-h-12"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="search">Therapist name</Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="min-h-12"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 w-full"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : isError ? (
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Error"}
        </p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <ClipboardList className="size-12 text-primary/30" strokeWidth={1.5} />
            <p className="font-semibold">No session history</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Your complete session history will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="space-y-2 p-4 text-sm">
                    <p className="font-medium">{item.therapist.name}</p>
                    <p className="text-muted-foreground">
                      {formatWAT(item.dateIso)} WAT
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Session {item.sessionNumber ?? "—"} ·{" "}
                      {item.sessionType === "intake" ? "Intake" : "Follow-up"} ·{" "}
                      {item.durationMins} min
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          item.status === "completed" &&
                            "bg-primary/10 text-primary",
                          item.status === "cancelled" &&
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.status}
                      </span>
                      {item.feedbackSubmitted ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          Feedback
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </>
      )}
    </main>
  );
}
