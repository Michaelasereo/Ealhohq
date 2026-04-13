import { PartnerWorkspaceEmptyState } from "@/components/admin/PartnerWorkspaceEmptyState";
import { PartnerWorkspaceShell } from "@/components/admin/PartnerWorkspaceShell";

export default function PartnerProgrammeSettingsPage() {
  return (
    <PartnerWorkspaceShell className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partner programme settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Programme-wide defaults: copy, booking rules, and notification toggles for the corporate
          wellness programme.
        </p>
      </div>
      <PartnerWorkspaceEmptyState
        icon="sliders"
        title="No programme settings yet"
        description="Defaults that apply to all super referral partners (email copy, booking constraints, WhatsApp toggles) will be configured here in a future release."
        action={{ label: "Back to overview", href: "/admin/partners" }}
      />
    </PartnerWorkspaceShell>
  );
}
