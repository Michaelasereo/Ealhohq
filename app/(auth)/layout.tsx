import type { ReactNode } from "react";

import { AuthChrome } from "@/components/auth/AuthChrome";

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthChrome>{children}</AuthChrome>;
}
