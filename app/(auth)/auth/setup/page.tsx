import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SetupWizard } from "./SetupWizard";

function SetupFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export default function AuthSetupPage() {
  return (
    <Suspense fallback={<SetupFallback />}>
      <SetupWizard />
    </Suspense>
  );
}
