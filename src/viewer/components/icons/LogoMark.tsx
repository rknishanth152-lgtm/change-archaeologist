/**
 * Change Archaeologist — Logo mark
 *
 * A stone cut into strata with one artifact held at its core.
 * Symmetrical on both axes, drawn on a 256 grid, one colour.
 */

import React from "react";

export interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  readonly size?: number;
}

export const LogoMark: React.FC<LogoMarkProps> = ({ size = 24, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" {...rest}>
    <path
      fillRule="evenodd"
      d="M128 8L190 70H66ZM50 86H206L248 128L206 170H50L8 128ZM128 102L102 128L128 154L154 128ZM128 248L66 186H190Z"
    />
  </svg>
);
