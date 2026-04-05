import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SetupWizard } from "./SetupWizard";

function SetupFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col items-center justify-center px-4 py-8">
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
    </main>
  );
}

export default function AuthSetupPage() {
  return (
    <Suspense fallback={<SetupFallback />}>
      <SetupWizard />
    </Suspense>
  );
}
