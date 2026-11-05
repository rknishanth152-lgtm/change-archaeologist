/**
 * AnimatedGroup Component
 *
 * Retrieved & Adapted from:
 * - https://motion-primitives.com/c/animated-group.json
 *
 * Adapted for Change Archaeologist Evidence Atlas:
 * - Staggered entrance for report metrics, findings, and list cards
 * - Respects prefers-reduced-motion via useReducedMotion()
 * - Compatible with React 19 and Motion
 */

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "../../utils/cn.js";

export type PresetType = "fade" | "slide" | "scale";

export interface AnimatedGroupProps {
  children: React.ReactNode;
  className?: string;
  preset?: PresetType;
  stagger?: number;
}

const presetVariants: Record<PresetType, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  },
  slide: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
  },
};

export function AnimatedGroup({
  children,
  className,
  preset = "slide",
  stagger = 0.05,
}: AnimatedGroupProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : stagger,
      },
    },
  };

  const itemVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 1, y: 0 },
        visible: { opacity: 1, y: 0, transition: { duration: 0 } },
      }
    : presetVariants[preset];

  return (
    <motion.div
      initial={shouldReduceMotion ? "visible" : "hidden"}
      animate="visible"
      variants={containerVariants}
      className={cn(className)}
    >
      {React.Children.map(children, (child, idx) => {
        if (!child) return null;
        return (
          <motion.div key={idx} variants={itemVariants}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
