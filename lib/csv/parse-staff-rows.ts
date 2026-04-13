/** Minimal CSV parser for staff onboarding (comma-separated, optional quotes). */

export type StaffCsvRow = {
  name: string;
  email: string;
  gender: string;
  phone: string;
};

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/""/g, '"');
  }
  return t;
}

/** Split a CSV line respecting double-quoted fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(stripQuotes(cur));
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(stripQuotes(cur));
  return out;
}

export function parseStaffCsv(content: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(splitCsvLine(lines[i]));
  }
  return { headers, rows };
}

export function rowToStaffRecord(
  headers: string[],
  cols: string[],
): StaffCsvRow | null {
  const map: Record<string, string> = {};
  headers.forEach((h, j) => {
    map[h] = (cols[j] ?? "").trim();
  });

  const emailRaw =
    map.email ||
    map["email address"] ||
    map["e-mail"] ||
    "";
  const nameRaw = map.name || map.fullname || map["full name"] || "";

  const email = emailRaw.trim().toLowerCase();
  const name = nameRaw.trim();
  if (!email || !name) return null;

  const gender = (map.gender || "").trim();
  const phone = (map.phone || map.mobile || map["phone number"] || "").trim();

  return { name, email, gender, phone };
}
