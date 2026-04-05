import { TherapistMessagesClient } from "@/components/therapist/TherapistMessagesClient";

export default function TherapistMessagesPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold">Messages</h1>
      <TherapistMessagesClient />
    </div>
  );
}
