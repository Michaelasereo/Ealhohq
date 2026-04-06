import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ealho.com";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/book`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/for-organisations`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/therapist-standards`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
