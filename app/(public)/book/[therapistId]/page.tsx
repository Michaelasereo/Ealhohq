import { BookTherapistClient } from "@/components/booking/BookTherapistClient";
import { CaptureReferralFromUrl } from "@/components/referral/CaptureReferralFromUrl";

export default function GuestTherapistBookPage() {
  return (
    <>
      <CaptureReferralFromUrl />
      <BookTherapistClient confirmHref="/book/confirm" />
    </>
  );
}
