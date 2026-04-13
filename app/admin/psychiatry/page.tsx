"use client";

import { AdminPsychiatricReferralsPanel } from "@/components/admin/AdminPsychiatricReferralsPanel";
import { AdminPsychiatrySettings } from "@/components/admin/AdminPsychiatrySettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminPsychiatryPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Psychiatry</h1>
        <p className="text-sm text-muted-foreground">
          Referrals, bookings, and the psychiatrist directory. Directory forms
          also appear under <span className="text-foreground">Settings → Psychiatry</span>.
        </p>
      </div>

      <Tabs defaultValue="referrals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referrals" className="h-11">
            Referrals
          </TabsTrigger>
          <TabsTrigger value="directory" className="h-11">
            Directory
          </TabsTrigger>
        </TabsList>
        <TabsContent value="referrals" className="mt-6">
          <AdminPsychiatricReferralsPanel />
        </TabsContent>
        <TabsContent value="directory" className="mt-6">
          <AdminPsychiatrySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
