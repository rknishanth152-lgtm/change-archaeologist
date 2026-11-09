/**
 * TactileButton Component
 *
 * Retrieved & Adapted from:
 * - https://buttons.ibelick.com/ (tactile micro-interaction, active spring feedback, inset highlights)
 *
 * Adapted for Change Archaeologist Evidence Atlas design tokens:
 * - Precision hairline borders
 * - Subtle tactile feedback (active:scale-[0.96] with motion-safe guard)
 * - Variants: primary (accent), secondary (neutral), ghost, outline
 * - Full accessible keyboard focus rings & ARIA semantics
 */

import * as React from "react";
import { cn } from "../../utils/cn.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "xs" | "sm" | "md";

export interface TactileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-action-primary text-on-action font-medium border border-transparent hover:bg-action-hover focus-visible:ring-border-focus",
  secondary:
    "bg-surface-elevated text-text-primary border border-hairline hover:bg-surface-hover hover:border-border-interactive focus-visible:ring-border-focus",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent focus-visible:ring-border-focus",
  outline:
    "bg-ground text-text-secondary border border-hairline hover:text-text-primary hover:border-border-interactive focus-visible:ring-border-focus",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-7 px-2 text-xs font-sans gap-1 rounded-sm",
  sm: "h-8 px-2.5 text-xs font-sans gap-1.5 rounded-sm",
  md: "h-8 px-3.5 text-xs font-sans font-medium gap-2 rounded-sm",
};

export const TactileButton = React.forwardRef<HTMLButtonElement, TactileButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "sm",
      icon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "relative inline-flex items-center justify-center select-none cursor-pointer",
          "transition-[background-color,border-color,color,transform] duration-fast ease-out",
          "motion-safe:active:scale-[0.96]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-ground",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
        {children}
      </button>
    );
  }
);

TactileButton.displayName = "TactileButton";

