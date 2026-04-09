/**
 * Shown on the homepage when no published DB reviews exist.
 * Generic, conversion-focused copy — no named hospitals, schools, or employers.
 */
export type FallbackReview = {
  id: string;
  content: string;
  rating: number;
  profession: string;
  location: string;
};

export const FALLBACK_REVIEWS: FallbackReview[] = [
  {
    id: "fb-1",
    rating: 5,
    profession: "Emergency physician",
    location: "Lagos",
    content:
      "Finally therapy that respects night shifts and impossible schedules. I felt heard without having to explain how the job works — that alone was a relief.",
  },
  {
    id: "fb-2",
    rating: 5,
    profession: "Registered nurse",
    location: "South West Nigeria",
    content:
      "I was running on empty for months. Having someone who gets the emotional load of patient care — without judgment — helped me breathe again.",
  },
  {
    id: "fb-3",
    rating: 5,
    profession: "Surgeon",
    location: "Abuja",
    content:
      "Confidential, straightforward, and focused on what I actually need. I wish I had done this sooner instead of waiting until I was completely burnt out.",
  },
  {
    id: "fb-4",
    rating: 5,
    profession: "Clinical officer",
    location: "Port Harcourt",
    content:
      "The sessions fit around my roster. I did not have to choose between my health and my patients — that made all the difference.",
  },
  {
    id: "fb-5",
    rating: 5,
    profession: "ICU nurse",
    location: "Nigeria",
    content:
      "I did not think online therapy could feel this human. Clear boundaries, real tools, and someone who understands what high-stakes care does to you.",
  },
];
