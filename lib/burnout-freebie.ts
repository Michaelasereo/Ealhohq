import { prisma } from "@/lib/prisma/client";

const PATH_KEY = "burnout_freebie_storage_path";
const FILENAME_KEY = "burnout_freebie_email_filename";
const DEFAULT_BUCKET = "freebies";

export function getFreebiesBucket(): string {
  return process.env.SUPABASE_FREEBIES_BUCKET?.trim() || DEFAULT_BUCKET;
}

export async function getBurnoutFreebieConfig(): Promise<{
  storagePath: string | null;
  emailFilename: string;
}> {
  const [pathRow, nameRow] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { key: PATH_KEY } }),
    prisma.siteConfig.findUnique({ where: { key: FILENAME_KEY } }),
  ]);
  return {
    storagePath: pathRow?.value?.trim() || null,
    emailFilename: nameRow?.value?.trim() || "Ealho-burnout-guide.pdf",
  };
}
