import { BookTherapistClient } from "@/components/booking/BookTherapistClient";

export default function PatientTherapistBookPage() {
  return (
    <BookTherapistClient
      confirmHref="/dashboard/book/confirm"
      usePatient
    />
  );
}
