"use client";

import { motion } from "framer-motion";
import { Heart, Lock, MapPin, Shield, Zap } from "lucide-react";

import { Pill, SectionReveal } from "@/components/organisations/SectionReveal";

const items = [
  {
    Icon: Shield,
    title: "Licensed and Verified Therapists",
    body: "Every Ealho therapist holds a recognised clinical qualification. No unverified counsellors. No life coaches presented as therapists.",
  },
  {
    Icon: MapPin,
    title: "Nationwide Coverage",
    body: "Virtual sessions mean your staff and patients can access therapy from anywhere in Nigeria. Lagos, Abuja, Port Harcourt, Kano, and beyond.",
  },
  {
    Icon: Zap,
    title: "Simple Onboarding",
    body: "Most partnerships are active within one week of agreement. No complex IT integration. No lengthy procurement process.",
  },
  {
    Icon: Heart,
    title: "Culturally Grounded Care",
    body: "Our therapists understand the Nigerian context — the stigma, the family dynamics, the workplace pressures, the faith dimension.",
  },
  {
    Icon: Lock,
    title: "Full Confidentiality",
    body: "Session content is never shared with employers or management. Organisations receive only anonymised utilisation reports.",
  },
] as const;

export function WhyOrganisationsChooseEalho() {
  return (
    <SectionReveal className="bg-[#1A1A1A] px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1120px]">
        <Pill dark>[ WHY EALHO ]</Pill>
        <h3 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-white sm:text-[42px]">
          Why Organisations Choose Ealho
        </h3>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.slice(0, 3).map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl border border-white/15 bg-[#202020] p-5"
            >
              <item.Icon className="text-[#D6EAE1]" size={20} strokeWidth={1.6} />
              <p className="mt-3 text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{item.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="mx-auto mt-4 grid max-w-[760px] gap-4 md:grid-cols-2">
          {items.slice(3).map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl border border-white/15 bg-[#202020] p-5"
            >
              <item.Icon className="text-[#D6EAE1]" size={20} strokeWidth={1.6} />
              <p className="mt-3 text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}
