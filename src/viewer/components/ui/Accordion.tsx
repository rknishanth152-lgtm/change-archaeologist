/**
 * Accordion Component
 *
 * Retrieved & Adapted from:
 * - https://ui.shadcn.com/r/styles/default/accordion.json (Accordion anatomy: Item, Trigger, Content)
 * - https://motion-primitives.com/c/disclosure.json (smooth animated height transitions)
 *
 * Adapted for Change Archaeologist Evidence Atlas:
 * - Accessible WAI-ARIA accordion pattern
 * - Smooth Motion height easing
 * - Architectural hairline borders & terracotta focus rings
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn.js";
import {
  Disclosure,
  DisclosureTrigger,
  DisclosureContent,
} from "./Disclosure.js";

export interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div
      role="region"
      aria-label="Accordion sections"
      className={cn("divide-y divide-hairline border-y border-hairline", className)}
    >
      {children}
    </div>
  );
}

export interface AccordionItemProps {
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AccordionItem({
  children,
  className,
  defaultOpen = false,
  open,
  onOpenChange,
}: AccordionItemProps) {
  return (
    <Disclosure
      open={open ?? defaultOpen}
      onOpenChange={onOpenChange}
      className={cn("py-1", className)}
    >
      {children}
    </Disclosure>
  );
}

export interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionTrigger({
  children,
  className,
}: AccordionTriggerProps) {
  return (
    <DisclosureTrigger>
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between py-2 text-left font-sans text-xs font-medium text-text-primary",
          "hover:text-text-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus",
          "transition-colors group",
          className
        )}
      >
        <span>{children}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className="text-text-muted transition-transform duration-200 group-aria-[expanded=true]:rotate-180 shrink-0 ml-2"
        />
      </button>
    </DisclosureTrigger>
  );
}

export interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionContent({
  children,
  className,
}: AccordionContentProps) {
  return (
    <DisclosureContent className={cn("text-xs text-text-secondary pb-3 pt-1", className)}>
      {children}
    </DisclosureContent>
  );
}

