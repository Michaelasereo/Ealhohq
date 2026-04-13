import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

function redisFromEnv(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = redisFromEnv();

const limiters: Record<string, Ratelimit> = {};

function limiter(
  name: string,
  maxRequests: number,
  window: `${number} s` | `${number} m` | `${number} h`,
): Ratelimit | null {
  if (!redis) return null;
  const key = `${name}:${maxRequests}:${window}`;
  if (!limiters[key]) {
    limiters[key] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
      prefix: `ealho:rl:${name}`,
      analytics: false,
    });
  }
  return limiters[key];
}

function clientKey(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  const first = xf?.split(",")[0]?.trim();
  if (first) return first;
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export type RateLimitPreset =
  | "payment_initialize"
  | "booking_create"
  | "auth_send_otp"
  | "auth_verify_otp"
  | "psychiatric_invitation_patch";

const PRESETS: Record<
  RateLimitPreset,
  { max: number; window: `${number} s` | `${number} m` }
> = {
  payment_initialize: { max: 30, window: "1 m" },
  booking_create: { max: 40, window: "1 m" },
  auth_send_otp: { max: 8, window: "1 m" },
  auth_verify_otp: { max: 30, window: "1 m" },
  psychiatric_invitation_patch: { max: 40, window: "1 m" },
};

/**
 * Returns a 429 NextResponse if the client exceeded the limit, or null to continue.
 * When Upstash env vars are not set, always returns null (no in-memory limiter — use Upstash in production).
 */
export async function enforceApiRateLimit(
  req: Request,
  preset: RateLimitPreset,
): Promise<NextResponse | null> {
  const { max, window } = PRESETS[preset];
  const rl = limiter(preset, max, window);
  if (!rl) return null;

  const identifier = clientKey(req);
  const result = await rl.limit(identifier);
  void result.pending;
  if (!result.success) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000),
    );
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests. Please wait a moment and try again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "Cache-Control": "no-store",
        },
      },
    );
  }
  return null;
}
