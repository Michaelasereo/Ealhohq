"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Users } from "lucide-react";

import { AnonymousBadge } from "@/components/therapist/AnonymousBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";

type ClientRow = {
  id: string;
  fullName: string;
  email: string;
  isAnonymous?: boolean;
  bookings: { date: string; startTime: string }[];
  _count: { bookings: number };
};

async function fetchClients(search: string): Promise<ClientRow[]> {
  const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const res = await fetch(`/api/therapist/clients${q}`, {
    credentials: "include",
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: ClientRow[];
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? "Failed to load clients");
  }
  return json.data;
}

export default function TherapistClientsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["therapist-clients", debounced],
    queryFn: () => fetchClients(debounced),
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 p-4 pb-20">
      <header>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-sm text-muted-foreground">
          People who have booked with you.
        </p>
      </header>

      <div className="space-y-2">
        <Label htmlFor="client-search">Search</Label>
        <Input
          id="client-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or email"
          className="min-h-12"
          autoComplete="off"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Error"}
        </p>
      ) : null}

      {!isLoading && data && data.length === 0 && !debounced ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <Users className="size-12 text-gray-300" strokeWidth={1.5} />
            <p className="font-semibold">No clients yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Clients will appear here after their first session with you.
            </p>
            <Link
              href="/therapist/availability"
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-12",
              )}
            >
              View your availability
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && data && data.length === 0 && debounced ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No clients match your search.
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && data && data.length > 0 ? (
        <ul className="space-y-3">
          {data.map((c) => {
            const last = c.bookings[0];
            const lastLabel = last
              ? formatWAT(
                  bookingDateStartToIso(new Date(last.date), last.startTime),
                )
              : "—";
            return (
              <li key={c.id}>
                <Link
                  href={`/therapist/clients/${c.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-auto min-h-0 w-full flex-col items-stretch justify-start gap-2 p-4 text-left font-normal hover:bg-muted/60",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2 text-base font-medium">
                    {c.fullName}
                    {c.isAnonymous ? <AnonymousBadge /> : null}
                  </span>
                  {c.email ? (
                    <span className="text-sm text-muted-foreground">
                      {c.email}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Email hidden (anonymous)
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {c._count.bookings} session
                    {c._count.bookings === 1 ? "" : "s"} · Last: {lastLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
