"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type GuestDetails = {
  fullName: string;
  email: string;
  phone: string;
};

type Props = {
  value: GuestDetails;
  onChange: (next: GuestDetails) => void;
  disabled?: boolean;
};

export function GuestDetailsForm({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm font-medium">Your details</p>
      <div className="space-y-1">
        <Label htmlFor="guest-name">Full name</Label>
        <Input
          id="guest-name"
          className="h-11"
          value={value.fullName}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, fullName: e.target.value })}
          autoComplete="name"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="guest-email">Email</Label>
        <Input
          id="guest-email"
          type="email"
          className="h-11"
          value={value.email}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          autoComplete="email"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="guest-phone">Phone (WhatsApp)</Label>
        <Input
          id="guest-phone"
          type="tel"
          className="h-11"
          value={value.phone}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          autoComplete="tel"
        />
      </div>
    </div>
  );
}
