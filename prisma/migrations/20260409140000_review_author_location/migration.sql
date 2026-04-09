-- Public testimonial location (shown with profession; name never shown on site)
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "authorLocation" TEXT;
