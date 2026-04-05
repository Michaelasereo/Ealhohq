import { useQuery } from "@tanstack/react-query";

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => null,
    enabled: Boolean(sessionId),
  });
}
