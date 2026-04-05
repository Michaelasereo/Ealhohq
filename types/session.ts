/**
 * In-call UI state (Agora channel, timer) — not persisted as source of truth.
 */
export type SessionRoomState = {
  sessionId: string;
  channelName?: string;
  startedAtIso?: string;
};
