"use client";

import { AdminPharmacySettings } from "@/components/admin/AdminPharmacySettings";

export default function AdminPharmacyPartnersPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-8">
      <p className="text-sm text-muted-foreground">
        Directory of pickup locations for the psychiatric pathway. The same form lives under{" "}
        <span className="text-foreground">Settings → Pharmacy</span>.
      </p>
      <AdminPharmacySettings />
    </div>
  );
}
