import { useQuery } from "@tanstack/react-query";

export function useAvailableSlots(therapistId: string | undefined) {
  return useQuery({
    queryKey: ["availability", "slots", therapistId],
    queryFn: async () => [],
    enabled: Boolean(therapistId),
  });
}
