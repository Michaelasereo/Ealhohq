import DashboardLayout from "@/components/shared/DashboardLayout";

export default function TherapistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="therapist">{children}</DashboardLayout>;
}
