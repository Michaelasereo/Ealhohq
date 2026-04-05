import { create } from "zustand";

import type { BookingDraft } from "@/types/booking";

const SPECIALIZATION_OPTIONS = [
  "Anxiety",
  "Depression",
  "Trauma & PTSD",
  "Grief",
  "Relationships",
  "Stress",
  "CBT",
  "DBT",
  "Other",
] as const;

export type TherapistEnrollDraft = {
  step: 1 | 2 | 3 | 4;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  specializations: string[];
  qualifications: string[];
  bio: string;
  profilePhotoBase64: string | null;
  certificateFileName: string | null;
  consentTermsPrivacy: boolean;
  consentTherapistStandards: boolean;
  consentInfoAccurate: boolean;
};

export const defaultTherapistEnrollDraft = (): TherapistEnrollDraft => ({
  step: 1,
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  specializations: [],
  qualifications: [],
  bio: "",
  profilePhotoBase64: null,
  certificateFileName: null,
  consentTermsPrivacy: false,
  consentTherapistStandards: false,
  consentInfoAccurate: false,
});

export { SPECIALIZATION_OPTIONS };

type BookingState = {
  draft: BookingDraft | null;
  setDraft: (draft: BookingDraft | null) => void;
  reset: () => void;
  therapistEnroll: TherapistEnrollDraft | null;
  setTherapistEnroll: (partial: Partial<TherapistEnrollDraft> | null) => void;
  setTherapistStep: (step: TherapistEnrollDraft["step"]) => void;
  resetTherapistEnroll: () => void;
  /** Landing page: full booking modal */
  bookingModalOpen: boolean;
  setBookingModalOpen: (open: boolean) => void;
};

export const useBookingStore = create<BookingState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  reset: () => set({ draft: null }),
  therapistEnroll: null,
  bookingModalOpen: false,
  setBookingModalOpen: (open) => set({ bookingModalOpen: open }),
  setTherapistEnroll: (partial) =>
    set((state) => {
      if (partial === null) {
        return { therapistEnroll: null };
      }
      const base = state.therapistEnroll ?? defaultTherapistEnrollDraft();
      return { therapistEnroll: { ...base, ...partial } };
    }),
  setTherapistStep: (step) =>
    set((state) => {
      const base = state.therapistEnroll ?? defaultTherapistEnrollDraft();
      return { therapistEnroll: { ...base, step } };
    }),
  resetTherapistEnroll: () => set({ therapistEnroll: null }),
}));
