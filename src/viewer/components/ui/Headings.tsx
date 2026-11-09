/**
 * Shared headings, so every panel starts on the same grid.
 * View headers are 56px tall and line up across the split.
 */

import React from "react";

export const VIEW_HEADER_CLASS =
  "h-14 shrink-0 px-4 flex items-center justify-between gap-3 border-b border-hairline bg-panel";

export const ViewHeader: React.FC<{
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly children?: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className={`${VIEW_HEADER_CLASS} sticky top-0 z-10`}>
    <h2 className="flex items-center gap-2 min-w-0 text-[15px] font-semibold text-text-primary">
      <span className="text-text-accent shrink-0">{icon}</span>
      <span className="truncate">{title}</span>
    </h2>
    {children}
  </div>
);

export const SectionHeading: React.FC<{
  readonly id?: string;
  readonly as?: "h2" | "h3" | "h4";
  readonly icon: React.ReactNode;
  readonly count?: number;
  readonly children: React.ReactNode;
}> = ({ id, as: Tag = "h3", icon, count, children }) => (
  <Tag id={id} className="flex items-center gap-2 text-sm font-semibold text-text-primary">
    <span className="text-text-accent shrink-0">{icon}</span>
    <span>{children}</span>
    {count !== undefined && <span className="font-normal text-text-secondary tabular-nums">{count}</span>}
  </Tag>
);

export const PartHeading: React.FC<{
  readonly icon: React.ReactNode;
  readonly children: React.ReactNode;
}> = ({ icon, children }) => (
  <span className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
    <span className="text-text-accent shrink-0">{icon}</span>
    <span>{children}</span>
  </span>
);
