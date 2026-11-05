/**
 * Change Archaeologist — Forensic Stratigraphy & Epistemic Bridge Glyphs
 *
 * Domain-specific, hand-authored 16x16 SVG iconography system:
 * 1.  GlyphMark          - Archaeological strata cross-section with survey probe
 * 2.  GlyphGuardClause   - Defensive boundary barrier and safety gate
 * 3.  GlyphConditional   - Branching decision diamond with diverging paths
 * 4.  GlyphThrowStmt     - Exception eruption / upward execution ejection
 * 5.  GlyphReturnStmt    - Function return / exit value turnaround
 * 6.  GlyphDeltaAdded    - Stratum insertion / added AST node
 * 7.  GlyphDeltaModified - Mathematical delta / mutated AST node
 * 8.  GlyphDeltaRemoved  - Stratum excision / removed AST node
 * 9.  GlyphCorrStrong    - Double solid bond / direct verifiable invocation
 * 10. GlyphCorrWeak      - Dashed bridge / indirect or co-occurring test update
 * 11. GlyphCorrUncertain - Ambiguous dotted bridge with interrogation point
 * 12. GlyphCorrNone      - Severed / slashed bridge representing missing test coverage
 * 13. GlyphEvidencePin   - Stratigraphic drill pin / source coordinate anchor
 * 14. GlyphEpistemicTier - Hierarchical strata levels (Evidence → Observation → Inference)
 *
 * All glyphs share a consistent 16x16 coordinate space, 1.5px stroke weight,
 * support currentColor or semantic tokens, and provide accessible labeling.
 */

import React from "react";

export interface GlyphProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  title?: string;
}

const baseGlyphProps = (
  size: number | string = 16,
  title?: string,
  className?: string,
  props?: React.SVGProps<SVGSVGElement>
) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  ...(title
    ? { role: "img", "aria-label": title }
    : { "aria-hidden": "true" as const }),
  ...props,
});

/**
 * 1. GlyphMark: Product identity mark.
 * Archaeological strata layer cross-section with an embedded precision probe.
 */
export const GlyphMark: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Geological strata layers */}
    <path d="M2 4.5h12" />
    <path d="M2 11.5h12" />
    {/* Central survey probe with diamond head */}
    <path d="M8 2v5" />
    <path d="M6 9.5L8 14l2-4.5z" fill="currentColor" fillOpacity={0.2} />
    <circle cx="8" cy="8" r="1.25" fill="currentColor" />
  </svg>
);

/**
 * 2. GlyphGuardClause: Defensive boundary barrier / precondition gate.
 */
export const GlyphGuardClause: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Shield boundary */}
    <path d="M3 3.5l5-1.5 5 1.5v4c0 3.5-3 5.5-5 6.5-2-1-5-3-5-6.5v-4z" />
    {/* Horizontal defensive guard latch */}
    <path d="M6 7.5h4" />
    <path d="M8 5.5v4" />
  </svg>
);

/**
 * 3. GlyphConditional: Branching decision diamond with diverging path stems.
 */
export const GlyphConditional: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Central decision diamond */}
    <path d="M8 2.5L12.5 7 8 11.5 3.5 7z" />
    {/* Branching exit paths */}
    <path d="M12.5 7h1.5" />
    <path d="M8 11.5v2" />
    <path d="M8 4.5v5" strokeDasharray="1 1" />
  </svg>
);

/**
 * 4. GlyphThrowStmt: Exception eruption / upward execution ejection.
 */
export const GlyphThrowStmt: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Upward ejection arrow breaking through boundary */}
    <path d="M8 13.5V3.5" />
    <path d="M4.5 7L8 3.5 11.5 7" />
    {/* Base confinement brackets */}
    <path d="M3 13.5h10" />
    <path d="M2.5 10.5h1" />
    <path d="M12.5 10.5h1" />
  </svg>
);

/**
 * 5. GlyphReturnStmt: Function exit turnaround trajectory.
 */
export const GlyphReturnStmt: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Turnaround curve exiting leftward */}
    <path d="M13 4.5v4a3 3 0 01-3 3H3.5" />
    <path d="M6 8.5L3 11.5l3 3" />
  </svg>
);

/**
 * 6. GlyphDeltaAdded: Stratum insertion / added AST element.
 */
export const GlyphDeltaAdded: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Stratum boundary guide */}
    <rect x="2" y="2" width="12" height="12" rx="2" strokeDasharray="2 2" strokeOpacity={0.4} />
    {/* Plus glyph */}
    <path d="M8 4.5v7" />
    <path d="M4.5 8h7" />
  </svg>
);

/**
 * 7. GlyphDeltaModified: Mathematical Delta triangle / modified AST node.
 */
export const GlyphDeltaModified: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Greek Delta triangle */}
    <path d="M8 2.5L13.5 13H2.5z" />
    {/* Internal change core */}
    <circle cx="8" cy="9.5" r="1.25" fill="currentColor" />
  </svg>
);

/**
 * 8. GlyphDeltaRemoved: Stratum excision / removed AST node.
 */
export const GlyphDeltaRemoved: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Stratum boundary guide */}
    <rect x="2" y="2" width="12" height="12" rx="2" strokeDasharray="2 2" strokeOpacity={0.4} />
    {/* Minus strike */}
    <path d="M4.5 8h7" strokeWidth={2} />
  </svg>
);

/**
 * 9. GlyphCorrStrong: Double solid bridge / direct verifiable invocation bond.
 */
export const GlyphCorrStrong: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Source and target nodes */}
    <circle cx="3.5" cy="8" r="1.75" fill="currentColor" />
    <circle cx="12.5" cy="8" r="1.75" fill="currentColor" />
    {/* Double solid bridge */}
    <path d="M5.5 6.5h5" />
    <path d="M5.5 9.5h5" />
  </svg>
);

/**
 * 10. GlyphCorrWeak: Dashed bridge / indirect or temporal test bond.
 */
export const GlyphCorrWeak: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Source and target nodes */}
    <circle cx="3.5" cy="8" r="1.75" />
    <circle cx="12.5" cy="8" r="1.75" />
    {/* Dashed bridge */}
    <path d="M5.5 8h1.2" />
    <path d="M7.7 8h1.2" />
    <path d="M9.9 8h1.2" />
  </svg>
);

/**
 * 11. GlyphCorrUncertain: Dotted bridge with interrogation center / ambiguous relationship.
 */
export const GlyphCorrUncertain: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Source and target nodes */}
    <circle cx="3" cy="8" r="1.5" />
    <circle cx="13" cy="8" r="1.5" />
    {/* Dotted bridge path */}
    <path d="M4.5 8h1" />
    <path d="M10.5 8h1" />
    {/* Center interrogation mark */}
    <path d="M7 6.2a1.2 1.2 0 012.2.6c0 .7-.8 1-.8 1.6" />
    <circle cx="8.2" cy="10.4" r="0.6" fill="currentColor" />
  </svg>
);

/**
 * 12. GlyphCorrNone: Severed / slashed bridge representing missing test coverage.
 */
export const GlyphCorrNone: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Source and target nodes */}
    <circle cx="3" cy="8" r="1.5" />
    <circle cx="13" cy="8" r="1.5" />
    {/* Severed bridge segments */}
    <path d="M4.5 8h1.5" />
    <path d="M10 8h1.5" />
    {/* Sharp severance slash */}
    <path d="M7 11.5l2-7" stroke="currentColor" strokeWidth={1.75} />
  </svg>
);

/**
 * 13. GlyphEvidencePin: Stratigraphic drill pin / concrete evidence anchor.
 */
export const GlyphEvidencePin: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Survey stake / map anchor pin */}
    <path d="M8 2.2a3.3 3.3 0 00-3.3 3.3c0 2.4 3.3 7.5 3.3 7.5s3.3-5.1 3.3-7.5A3.3 3.3 0 008 2.2z" />
    {/* Core coordinate aperture */}
    <circle cx="8" cy="5.5" r="1.2" fill="currentColor" />
  </svg>
);

/**
 * 14. GlyphEpistemicTier: Hierarchical strata levels (Evidence → Observation → Inference).
 */
export const GlyphEpistemicTier: React.FC<GlyphProps> = ({ size = 16, title, className, ...props }) => (
  <svg {...baseGlyphProps(size, title, className, props)}>
    {title && <title>{title}</title>}
    {/* Three stepped strata tiers */}
    <path d="M2.5 4h11" />
    <path d="M4 8h8" />
    <path d="M5.5 12h5" />
  </svg>
);

