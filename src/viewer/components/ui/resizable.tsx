/**
 * Resizable panels
 *
 * Adapted from shadcn/ui (https://ui.shadcn.com/docs/components/resizable),
 * built on react-resizable-panels and this project's tokens.
 */

import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "../../utils/cn.js";

export const ResizablePanelGroup = Group;
export const ResizablePanel = Panel;

export const ResizableHandle: React.FC<React.ComponentProps<typeof Separator>> = ({ className, ...props }) => (
  <Separator
    className={cn(
      "group relative flex w-2 shrink-0 items-stretch justify-center bg-transparent outline-none",
      className
    )}
    {...props}
  >
    <span className="w-px bg-hairline transition-colors duration-fast group-hover:bg-border-focus group-focus-visible:bg-border-focus group-data-[separator=active]:bg-border-focus" />
  </Separator>
);
