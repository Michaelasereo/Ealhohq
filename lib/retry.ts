/**
 * Retry a transient async operation (network blips). Does not retry on success.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = Math.max(1, opts?.attempts ?? 2);
  const delayMs = Math.max(0, opts?.delayMs ?? 800);
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw last;
}
