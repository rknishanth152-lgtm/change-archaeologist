/**
 * Disclosure Component
 *
 * Retrieved & Adapted from:
 * - https://motion-primitives.com/c/disclosure.json (Motion Primitives Disclosure component)
 *
 * Adapted for Change Archaeologist Evidence Atlas:
 * - Motion-based animated height expansion/collapse
 * - Fully respects prefers-reduced-motion via useReducedMotion()
 * - Native controls provide correct keyboard behavior (no duplicate toggle on native buttons)
 * - WAI-ARIA accessible button role, aria-expanded, aria-controls linked via unique IDs
 * - Parchment & hairline border styling
 */

import * as React from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
  type Transition,
  type Variant,
  type Variants,
} from "motion/react";
import { cn } from "../../utils/cn.js";

export interface DisclosureContextType {
  open: boolean;
  toggle: () => void;
  variants?: { expanded: Variant; collapsed: Variant };
  contentId: string;
}

const DisclosureContext = React.createContext<DisclosureContextType | undefined>(
  undefined
);

export interface DisclosureProviderProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  variants?: { expanded: Variant; collapsed: Variant };
  id?: string;
}

export function DisclosureProvider({
  children,
  open: openProp,
  onOpenChange,
  variants,
  id,
}: DisclosureProviderProps) {
  const [internalOpenValue, setInternalOpenValue] = React.useState<boolean>(openProp);
  const generatedId = React.useId();
  const contentId = id ?? generatedId;

  React.useEffect(() => {
    setInternalOpenValue(openProp);
  }, [openProp]);

  const toggle = React.useCallback(() => {
    const newOpen = !internalOpenValue;
    setInternalOpenValue(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  }, [internalOpenValue, onOpenChange]);

  return (
    <DisclosureContext.Provider
      value={{
        open: internalOpenValue,
        toggle,
        variants,
        contentId,
      }}
    >
      {children}
    </DisclosureContext.Provider>
  );
}

export function useDisclosure() {
  const context = React.useContext(DisclosureContext);
  if (!context) {
    throw new Error("useDisclosure must be used within a DisclosureProvider");
  }
  return context;
}

export interface DisclosureProps {
  id?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  variants?: { expanded: Variant; collapsed: Variant };
  transition?: Transition;
}

export function Disclosure({
  id,
  open: openProp = false,
  onOpenChange,
  children,
  className,
  transition,
  variants,
}: DisclosureProps) {
  return (
    <MotionConfig transition={transition}>
      <div className={className}>
        <DisclosureProvider
          id={id}
          open={openProp}
          onOpenChange={onOpenChange}
          variants={variants}
        >
          {children}
        </DisclosureProvider>
      </div>
    </MotionConfig>
  );
}

export interface DisclosureTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function DisclosureTrigger({
  children,
  className,
}: DisclosureTriggerProps) {
  const { toggle, open, contentId } = useDisclosure();

  return (
    <>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

        const isNativeButton = (child.type as any) === "button";
        const childProps = (child as React.ReactElement<any>).props;

        const commonProps: Record<string, any> = {
          onClick: (e: React.MouseEvent) => {
            if (childProps.onClick) childProps.onClick(e);
            toggle();
          },
          "aria-expanded": open,
          "aria-controls": childProps["aria-controls"] || contentId,
          className: cn(className, childProps.className),
        };

        // For non-button elements, add keyboard accessibility & ARIA role
        if (!isNativeButton) {
          commonProps.role = "button";
          commonProps.tabIndex = childProps.tabIndex ?? 0;
          commonProps.onKeyDown = (e: React.KeyboardEvent) => {
            if (childProps.onKeyDown) childProps.onKeyDown(e);
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          };
        }

        return React.cloneElement(child as React.ReactElement<any>, commonProps);
      })}
    </>
  );
}

export interface DisclosureContentProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export function DisclosureContent({
  id,
  children,
  className,
}: DisclosureContentProps) {
  const { open, variants, contentId } = useDisclosure();
  const shouldReduceMotion = useReducedMotion();

  const elementId = id ?? contentId;

  // Reduced motion: zero duration, instant state transition
  const BASE_VARIANTS: Variants = shouldReduceMotion
    ? {
        expanded: { height: "auto", opacity: 1, transition: { duration: 0 } },
        collapsed: { height: 0, opacity: 0, transition: { duration: 0 } },
      }
    : {
        expanded: {
          height: "auto",
          opacity: 1,
          transition: {
            height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.18, delay: 0.04 },
          },
        },
        collapsed: {
          height: 0,
          opacity: 0,
          transition: {
            height: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.12 },
          },
        },
      };

  const combinedVariants = {
    expanded: { ...BASE_VARIANTS.expanded, ...variants?.expanded },
    collapsed: { ...BASE_VARIANTS.collapsed, ...variants?.collapsed },
  };

  return (
    <div id={elementId} className={cn("overflow-hidden", className)}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={combinedVariants}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
