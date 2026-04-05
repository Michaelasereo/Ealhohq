"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

type LandingSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
};

export function LandingSection({
  children,
  className,
  delay = 0,
  id,
}: LandingSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-12% 0px" });

  return (
    <motion.div
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
