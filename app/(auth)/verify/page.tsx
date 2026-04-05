import { redirect } from "next/navigation";

/** Legacy `/verify` → `/auth/verify` */
export default async function LegacyVerifyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : undefined;
  const q = email ? `?email=${encodeURIComponent(email)}` : "";
  redirect(`/auth/verify${q}`);
}
