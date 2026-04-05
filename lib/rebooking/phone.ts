/** Normalize to digits for WhatsApp (234…). */
export function normalizeNgDigits(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = `234${d.slice(1)}`;
  else if (d.length === 10 && !d.startsWith("234")) d = `234${d}`;
  return d.length >= 12 ? d : null;
}

export function firstName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? t;
}
