import { create } from "zustand";

import type { SessionRoomState } from "@/types/session";

type SessionState = {
  room: SessionRoomState | null;
  setRoom: (room: SessionRoomState | null) => void;
  reset: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
  reset: () => set({ room: null }),
}));
