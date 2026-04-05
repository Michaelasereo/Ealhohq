import { DateOverrideManager } from "@/components/availability/DateOverrideManager";
import { WeeklyScheduleEditor } from "@/components/availability/WeeklyScheduleEditor";

export default function AvailabilityPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-foreground">Availability</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Manage when patients can book sessions with you (WAT).
      </p>
      <div className="space-y-6">
        <WeeklyScheduleEditor />
        <DateOverrideManager />
      </div>
    </div>
  );
}
