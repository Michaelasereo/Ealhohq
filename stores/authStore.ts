import { create } from "zustand";

import type { AppRole, TherapistStatus } from "@/types/auth";

type AuthState = {
  role: AppRole | null;
  therapistStatus: TherapistStatus | null;
  setRole: (role: AppRole | null) => void;
  setTherapistStatus: (status: TherapistStatus | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  therapistStatus: null,
  setRole: (role) => set({ role }),
  setTherapistStatus: (therapistStatus) => set({ therapistStatus }),
  reset: () => set({ role: null, therapistStatus: null }),
}));
