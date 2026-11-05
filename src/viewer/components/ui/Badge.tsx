/**
 * Badge Component
 *
 * Retrieved & Adapted from:
 * - https://ui.shadcn.com/r/styles/default/badge.json (Radix / shadcn architecture)
 * - https://originui.com/badges (OriginUI status dot and micro-metric patterns)
 *
 * Adapted for Change Archaeologist Evidence Atlas design tokens:
 * - Variants: terracotta, verdigris, sandstone, amber, ink, outline
 * - Optional status dot (static, non-pulsing to prevent implying live runtime activity)
 * - Full TypeScript & Tailwind support
 */

import * as React from "react";
import { cn } from "../../utils/cn.js";

export type BadgeVariant =
  | "terracotta" // Structural AST Mutation / Weak Correlation / Modified Entity
  | "verdigris"  // Direct AST Invocation / Added Entity / Strong Correlation
  | "sandstone"  // Context / Neutral Metadata / Baseline
  | "amber"      // Caution / Incomplete Analysis / Boundary Notice
  | "ink"        // High Emphasis / Target Function Entity
  | "outline";   // Subtle Hairline Frame

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  terracotta: {
    container:
      "bg-status-modified-bg text-status-modified border-status-modified-border",
    dot: "bg-status-modified",
  },
  verdigris: {
    container:
      "bg-status-added-bg text-status-added border-status-added-border",
    dot: "bg-status-added",
  },
  sandstone: {
    container:
      "bg-surface-elevated text-text-secondary border-hairline",
    dot: "bg-text-muted",
  },
  amber: {
    container:
      "bg-status-removed-bg text-status-removed border-status-removed-border",
    dot: "bg-status-removed",
  },
  ink: {
    container:
      "bg-ground text-text-primary border-hairline font-semibold",
    dot: "bg-text-accent",
  },
  outline: {
    container:
      "bg-transparent text-text-secondary border-hairline",
    dot: "bg-text-muted",
  },
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "sandstone", dot = false, children, ...props }, ref) => {
    const { container, dot: dotColor } = variantStyles[variant];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs font-mono text-[10px] tracking-wide border transition-colors",
          container,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn("inline-flex rounded-full h-1.5 w-1.5 shrink-0", dotColor)}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
