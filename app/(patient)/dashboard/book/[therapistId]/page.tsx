import { BookTherapistClient } from "@/components/booking/BookTherapistClient";
import { CaptureReferralFromUrl } from "@/components/referral/CaptureReferralFromUrl";

export default function PatientTherapistBookPage() {
  return (
    <>
      <CaptureReferralFromUrl />
      <BookTherapistClient
        confirmHref="/dashboard/book/confirm"
        usePatient
      />
    </>
  );
}
