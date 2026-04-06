"use client";

import { useIsFetching } from "@tanstack/react-query";

import { TopProgressBar } from "@/components/shared/TopProgressBar";

export function GlobalFetchProgress() {
  const fetching = useIsFetching({ fetchStatus: "fetching" });
  return <TopProgressBar isLoading={fetching > 0} estimatedMs={3200} />;
}
