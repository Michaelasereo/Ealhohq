import { PartnerWorkspaceEmptyState } from "@/components/admin/PartnerWorkspaceEmptyState";
import { PartnerWorkspaceShell } from "@/components/admin/PartnerWorkspaceShell";

export default function PartnersOverviewPage() {
  return (
    <PartnerWorkspaceShell className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Partner analytics (sessions vs pool, utilisation, and ROI) will appear here as the
          programme is wired to bookings and monthly allocations.
        </p>
      </div>
      <PartnerWorkspaceEmptyState
        icon="bar-chart"
        title="No overview data yet"
        description="When corporate partners have covered sessions and approved pools, utilisation and ROI charts will show here. Add telehealth umbrellas under Super partners if needed, then corporate organisations under Partners, and approve monthly credit pools to get started."
        action={{ label: "Go to partners list", href: "/admin/partners/list" }}
      />
    </PartnerWorkspaceShell>
  );
}
