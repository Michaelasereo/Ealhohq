import { EyeOff } from "lucide-react";

export function AnonymousBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      <EyeOff size={10} strokeWidth={1.5} aria-hidden />
      Anonymous
    </span>
  );
}
