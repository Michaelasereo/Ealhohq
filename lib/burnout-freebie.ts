import { prisma } from "@/lib/prisma/client";

const PATH_KEY = "burnout_freebie_storage_path";
const FILENAME_KEY = "burnout_freebie_email_filename";
const DEFAULT_BUCKET = "freebies";
const DEFAULT_STORAGE_PATH = "burnout/current.pdf";

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
  const envStoragePath = process.env.BURNOUT_FREEBIE_STORAGE_PATH?.trim();
  const dbStoragePath = pathRow?.value?.trim();
  const resolvedStoragePath = envStoragePath || dbStoragePath || DEFAULT_STORAGE_PATH;

  return {
    storagePath: resolvedStoragePath,
    emailFilename: nameRow?.value?.trim() || "Ealho-burnout-guide.pdf",
  };
}
