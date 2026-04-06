"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { Pill, SectionReveal } from "@/components/organisations/SectionReveal";

function AnimatedOneInFour() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, 1, {
      duration: 0.9,
      onUpdate: (latest) => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView]);

  return (
    <div ref={ref}>
      <p className="text-5xl font-semibold tracking-[-0.03em] text-[#292612] sm:text-7xl">
        {value} in 4
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
        Nigerian workers experience symptoms of anxiety or depression in any given year.
      </p>
    </div>
  );
}

export function CrisisContext() {
  return (
    <SectionReveal className="bg-[#FAF8F5] px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1120px]">
        <Pill>[ THE CONTEXT ]</Pill>
        <h3 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-[#1A1A1A] sm:text-[42px]">
          The Mental Health Crisis in
          <br />
          Nigerian Workplaces Cannot Wait
        </h3>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <AnimatedOneInFour />
          <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
            Nigeria has one of the highest rates of unaddressed mental health burden in
            sub-Saharan Africa. Healthcare workers are among the most affected — with elevated
            rates of burnout, depression, and secondary traumatic stress in facilities nationwide.
            <br />
            <br />
            The consequences are visible in every organisation that pays attention: higher
            absenteeism, reduced concentration, interpersonal conflict, and staff leaving for
            opportunities abroad.
            <br />
            <br />
            Mental health is no longer a welfare conversation. It is a retention and productivity
            conversation.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 rounded-2xl bg-[#292612] p-5 text-[#D6EAE1]"
        >
          Organisations that invest in staff mental health see measurable returns in reduced
          turnover, lower absenteeism, and higher engagement. The question is no longer whether to
          invest — it is how to do it credibly and affordably.
        </motion.div>
      </div>
    </SectionReveal>
  );
}
