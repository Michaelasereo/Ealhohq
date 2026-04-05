import { prisma } from "@/lib/prisma/client";

const DEFAULT_SETTINGS_ID = "default";

type Payload = {
  paystackPublicKey?: string;
  paystackSecretKey?: string;
};

/**
 * Resolves Paystack keys: Admin App Settings payload overrides env (for server-side API calls).
 */
export async function getResolvedPaystackKeys(): Promise<{
  publicKey: string;
  secretKey: string;
}> {
  const row = await prisma.adminAppSettings.findUnique({
    where: { id: DEFAULT_SETTINGS_ID },
  });
  const stored = (row?.payload ?? {}) as Payload;

  const publicKey =
    (typeof stored.paystackPublicKey === "string" &&
      stored.paystackPublicKey.trim()) ||
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim() ||
    "";

  const secretKey =
    (typeof stored.paystackSecretKey === "string" &&
      stored.paystackSecretKey.trim()) ||
    process.env.PAYSTACK_SECRET_KEY?.trim() ||
    "";

  return { publicKey, secretKey };
}

export async function getPaystackSecretKey(): Promise<string> {
  const { secretKey } = await getResolvedPaystackKeys();
  return secretKey;
}
