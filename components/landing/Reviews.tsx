"use client";

import { Calendar, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { FALLBACK_REVIEWS } from "@/lib/fallback-reviews";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

type PublicReview = {
  id: string;
  content: string;
  rating: number;
  profession: string | null;
  location: string | null;
};

/** API may send profession/location or authorRole/authorLocation */
function toPublicReview(r: {
  id: string;
  content: string;
  rating: number;
  profession?: string | null;
  location?: string | null;
  authorRole?: string | null;
  authorLocation?: string | null;
}): PublicReview {
  return {
    id: r.id,
    content: r.content,
    rating: r.rating,
    profession: r.profession ?? r.authorRole ?? null,
    location: r.location ?? r.authorLocation ?? null,
  };
}

function visibleWindow(reviews: PublicReview[], start: number, len: number) {
  const out: PublicReview[] = [];
  if (reviews.length === 0) return out;
  for (let i = 0; i < len; i++) {
    out.push(reviews[(start + i) % reviews.length]!);
  }
  return out;
}

export function Reviews() {
  const setBookingModalOpen = useBookingStore((s) => s.setBookingModalOpen);
  const [reviews, setReviews] = useState<PublicReview[]>(
    FALLBACK_REVIEWS.slice(0, 3).map((r) => ({
      id: r.id,
      content: r.content,
      rating: r.rating,
      profession: r.profession,
      location: r.location,
    })),
  );
  const [total, setTotal] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fetchState, setFetchState] = useState<"loading" | "done">("loading");
  const [source, setSource] = useState<"database" | "fallback">("fallback");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/reviews?limit=12");
        const json = (await res.json()) as {
          success?: boolean;
          data?: PublicReview[];
          meta?: { total?: number };
        };
        if (json.success && json.data && json.data.length > 0) {
          setReviews(json.data.map(toPublicReview));
          setTotal(json.meta?.total ?? json.data.length);
          setSource("database");
        } else {
          setReviews((prev) =>
            prev.length > 0
              ? prev
              : FALLBACK_REVIEWS.slice(0, 3).map((r) => ({
                  id: r.id,
                  content: r.content,
                  rating: r.rating,
                  profession: r.profession,
                  location: r.location,
                })),
          );
          setTotal(0);
          setSource("fallback");
        }
      } catch {
        setReviews((prev) =>
          prev.length > 0
            ? prev
            : FALLBACK_REVIEWS.slice(0, 3).map((r) => ({
                id: r.id,
                content: r.content,
                rating: r.rating,
                profession: r.profession,
                location: r.location,
              })),
        );
        setSource("fallback");
      } finally {
        setFetchState("done");
      }
    })();
  }, []);

  useEffect(() => {
    if (reviews.length <= 3 || paused) return;
    const t = setInterval(() => {
      setActiveIndex((prev) => (prev >= reviews.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(t);
  }, [reviews.length, paused]);

  const go = (dir: -1 | 1) => {
    setActiveIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return reviews.length - 1;
      if (next >= reviews.length) return 0;
      return next;
    });
  };

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 5;

  const desktopCards =
    reviews.length > 3 ? visibleWindow(reviews, activeIndex, 3) : reviews;

  const showCards = reviews.length > 0;

  return (
    <section
      id="reviews"
      className="scroll-mt-24 w-full bg-white px-4 py-14 sm:px-6 sm:py-20"
    >
      <div className="mx-auto flex max-w-[980px] flex-col items-center text-center">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-1">
          <h2 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[52px] lg:leading-[1.05]">
            <span className="text-[#24221e]">Trusted by healthcare professionals</span>
            <br />
            <span className="text-[#807a5a]">across Nigeria</span>
          </h2>
          <p className="line-clamp-4 max-w-3xl text-pretty text-[15px] leading-relaxed tracking-[-0.02em] text-gray-600 sm:text-[16px]">
            Real experiences from doctors, nurses, and healthcare workers who chose Ealho.
          </p>
          <button
            type="button"
            onClick={() => setBookingModalOpen(true)}
            className={cn(
              "mt-2 inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-full border-0 bg-[#292612] px-6 text-base font-medium text-[#D6EAE1] transition-none hover:bg-[#292612] hover:text-[#D6EAE1]",
            )}
          >
            <Calendar size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
            <span>Book a Session</span>
          </button>
        </div>

        {fetchState === "done" && !showCards ? (
          <p className="mt-12 max-w-md text-[15px] leading-relaxed text-gray-500 md:mt-16">
            New reviews from clinicians will appear here soon.
          </p>
        ) : null}

        {showCards && fetchState === "done" ? (
          <>
            <div
              className="relative mx-auto mt-12 hidden w-full max-w-[980px] md:mt-16 md:block"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div
                className={cn(
                  "grid gap-4 px-10 sm:gap-5 sm:px-12 lg:px-14",
                  desktopCards.length === 1 && "mx-auto max-w-md grid-cols-1",
                  desktopCards.length === 2 && "grid-cols-2",
                  desktopCards.length >= 3 && "grid-cols-3",
                )}
              >
                {desktopCards.map((review, i) => (
                  <ReviewCard
                    key={`${activeIndex}-${review.id}-${i}`}
                    review={review}
                  />
                ))}
              </div>
              {reviews.length > 3 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-[#24221e] shadow-sm transition-colors hover:bg-gray-50"
                    aria-label="Previous reviews"
                  >
                    <ChevronLeft size={20} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-[#24221e] shadow-sm transition-colors hover:bg-gray-50"
                    aria-label="Next reviews"
                  >
                    <ChevronRight size={20} strokeWidth={1.5} />
                  </button>
                </>
              ) : null}
            </div>

            <div
              className="mt-12 flex w-full max-w-[980px] gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="min-w-[min(100%,280px)] max-w-[340px] shrink-0"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <ReviewCard review={review} />
                </div>
              ))}
            </div>

            {source === "database" ? (
              <p className="mt-10 max-w-3xl text-center text-[15px] leading-relaxed tracking-[-0.02em] text-gray-600 sm:text-[16px]">
                <span className="inline-flex items-center justify-center gap-1">
                  <Star className="size-4 fill-primary text-primary" strokeWidth={1.5} aria-hidden />
                  <span className="font-medium text-[#24221e]">{avg.toFixed(1)}</span>
                </span>
                <span className="text-gray-400"> · </span>
                {total >= 50 ? "50+" : `${Math.max(total, reviews.length)}+`} verified reviews from
                Nigerian healthcare professionals
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const role = review.profession?.trim() || null;
  const location = review.location?.trim() || null;
  const subtitle = [role, location].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col gap-4 rounded-[22px] border border-gray-200/80 bg-[#fafaf8] p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)]",
        "w-full max-w-[340px] mx-auto text-left",
      )}
    >
      <p className="flex-1 text-sm leading-relaxed text-gray-700">
        &ldquo;{review.content}&rdquo;
      </p>
      <div className="space-y-1 border-t border-gray-200/80 pt-4">
        <p className="text-xs font-semibold text-gray-900">Anonymous</p>
        {subtitle ? (
          <p className="text-xs text-gray-400">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
