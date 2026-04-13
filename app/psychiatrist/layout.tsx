import Link from "next/link";

export default function PsychiatristLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-4 py-3">
        <Link
          href="/psychiatrist/sessions"
          className="text-sm font-semibold text-foreground"
        >
          Ealho · Psychiatry
        </Link>
      </header>
      {children}
    </div>
  );
}
