import { PartnerWorkspaceEmptyState } from "@/components/admin/PartnerWorkspaceEmptyState";
import { PartnerWorkspaceShell } from "@/components/admin/PartnerWorkspaceShell";

export default function PartnerReportsPage() {
  return (
    <PartnerWorkspaceShell className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Export partner utilisation and billing summaries for finance and HR.
        </p>
      </div>
      <PartnerWorkspaceEmptyState
        icon="spreadsheet"
        title="No reports available yet"
        description="Monthly and quarterly CSV exports per partner will be available from this section once reporting is connected to bookings and pool usage."
        action={{ label: "Manage partners", href: "/admin/partners/list" }}
      />
    </PartnerWorkspaceShell>
  );
}
