export const BLOG_CATEGORIES = [
  "All",
  "Mental Health",
  "Therapy",
  "Burnout",
  "Relationships",
  "Work & Career",
  "Resources",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
