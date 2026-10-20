import { motion, useReducedMotion } from "motion/react";
import { cn } from "../lib/utils";

interface MagneticPinProps {
  className?: string;
  delay?: number;
}

export function MagneticPin({ className, delay = 0.16 }: MagneticPinProps) {
  const reduced = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      className={cn("magnet", className)}
      initial={reduced ? false : { y: -16, scale: 0.4, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 430, damping: 17, delay }}
    />
  );
}
