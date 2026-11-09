/**
 * Change Archaeologist — Heading glyphs
 *
 * One drawn set on a 20-unit grid with a single stroke weight. Each glyph
 * borrows from the logo's language: strata, cuts, and a diamond artifact.
 */

import React from "react";

export interface HeadingGlyphProps extends React.SVGProps<SVGSVGElement> {
  readonly size?: number;
}

const glyph = (displayName: string, children: React.ReactNode): React.FC<HeadingGlyphProps> => {
  const Component: React.FC<HeadingGlyphProps> = ({ size = 16, ...rest }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
  Component.displayName = displayName;
  return Component;
};

/** Strata split by a shaft, with the artifact below. */
export const GlyphDig = glyph("GlyphDig", <path d="M3 4h14M3 8h5M12 8h5M3 12h5M12 12h5M10 2.5V11M10 12.5l3 3-3 3-3-3z" />);

/** Code brackets around a cut. */
export const GlyphCodeTests = glyph("GlyphCodeTests", <path d="M6.5 4 2.5 10l4 6M13.5 4l4 6-4 6M10 5.5v9" />);

/** A loupe on its stand, the artifact in view. */
export const GlyphLoupe = glyph("GlyphLoupe", <><circle cx="10" cy="8" r="5.75" /><path d="M10 13.75V18M7 18h6M10 5.75 12.25 8 10 10.25 7.75 8z" /></>);

/** Layers displaced along a fault. */
export const GlyphFault = glyph("GlyphFault", <path d="M2.5 6H9M2.5 10.5H8M2.5 15H7M11 8.5h6.5M12 13h5.5M11.5 3 8.5 17" />);

/** A test flask, filled to a level. */
export const GlyphFlask = glyph("GlyphFlask", <path d="M7.5 2.75h5M8.5 2.75V8l-4.1 7a1.5 1.5 0 0 0 1.3 2.25h8.6a1.5 1.5 0 0 0 1.3-2.25L11.5 8V2.75M6.4 12.5h7.2" />);

/** A title bar on its post. */
export const GlyphTitle = glyph("GlyphTitle", <path d="M3.5 4.5h13M3.5 4.5v2M16.5 4.5v2M10 4.5v11.5M7.25 16h5.5" />);

/** A survey marker: the artifact on a stake. */
export const GlyphMarker = glyph("GlyphMarker", <path d="M10 2.5 14.25 6.75 10 11 5.75 6.75zM10 11v6.5M6.75 17.5h6.5" />);

export const GlyphEye = glyph("GlyphEye", <><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" /><path d="M10 7.75 12.25 10 10 12.25 7.75 10z" /></>);

export const GlyphEyeOff = glyph("GlyphEyeOff", <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10zM4 16 16 4" />);

/** One observation branching into possibilities. */
export const GlyphBranch = glyph("GlyphBranch", <><path d="M10 17.5V11M10 11 5 6.25M10 11l5-4.75" /><circle cx="4" cy="4.5" r="1.75" /><circle cx="16" cy="4.5" r="1.75" /></>);

/** Ground nobody dug. */
export const GlyphUndug = glyph("GlyphUndug", <><rect x="3" y="3" width="14" height="14" rx="2" strokeDasharray="2.5 2.5" /><path d="m6.5 13.5 7-7" /></>);

/** The older layers: strata with the lowest emphasised. */
export const GlyphBefore = glyph("GlyphBefore", <path d="M4 5h12M4 10h12M4 15h6M13.5 12.5 11 15l2.5 2.5" />);

/** The newer layers: strata with a new one arriving. */
export const GlyphAfter = glyph("GlyphAfter", <path d="M4 5h12M4 10h12M4 15h6M13.5 12.5 16 15l-2.5 2.5" />);

/** A report lowered into a tray. */
export const GlyphDrop = glyph("GlyphDrop", <path d="M10 2.75v9.5M6.25 8.75 10 12.5l3.75-3.75M3 13.5v2.25a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V13.5" />);

/** A tray of specimens. */
export const GlyphSpecimens = glyph("GlyphSpecimens", <><rect x="2.75" y="2.75" width="14.5" height="14.5" rx="2.5" /><path d="M2.75 10h14.5M10 2.75v14.5" /></>);

export const GlyphPrompt = glyph("GlyphPrompt", <><rect x="2.5" y="3.5" width="15" height="13" rx="2" /><path d="m6 8 2.25 2L6 12M10.5 12.5H14" /></>);

const BAR = { x: 6, width: 36, height: 5, rx: 1.5 };
const LOWER = "var(--dig-stratum-b)";

/** Small cross-sections that show what each sample is about. */
export const SampleArt: React.FC<{ readonly id: string }> = ({ id }) => (
  <svg width={48} height={40} viewBox="0 0 48 40" fill="none" aria-hidden="true" className="shrink-0">
    {id === "F" ? (
      <>
        {[5, 13, 21, 29].map((y) => (
          <rect key={y} x={6} y={y} width={15} height={5} rx={1.5} style={{ fill: LOWER }} />
        ))}
        <rect x={27} y={5.5} width={15} height={28} rx={1.5} strokeDasharray="2.5 2.5" style={{ stroke: "var(--status-removed-fg)" }} />
      </>
    ) : (
      <>
        <rect {...BAR} y={5} style={{ fill: LOWER }} />
        {id === "A" ? (
          <rect {...BAR} x={6.5} y={13.5} width={35} height={4} strokeDasharray="3 2.5" style={{ stroke: "var(--status-removed-fg)" }} />
        ) : (
          <rect {...BAR} y={13} style={{ fill: "var(--dig-modified)" }} />
        )}
        <rect {...BAR} y={21} style={{ fill: id === "D" || id === "E" ? LOWER : LOWER }} />
        <rect {...BAR} y={29} style={{ fill: id === "D" || id === "E" ? "var(--dig-test)" : LOWER }} />
      </>
    )}
    {id === "B" && (
      <path d="M17 15.5h14M20 13l-3 2.5 3 2.5M28 13l3 2.5-3 2.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--status-modified-fg)" }} />
    )}
    {id === "C" && (
      <path d="M24 15.5v10.5H12M15.5 22.5 12 26l3.5 3.5" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--status-modified-fg)" }} />
    )}
    {id === "D" && <path d="M24 15.5V29" strokeWidth={3} style={{ stroke: "var(--dig-shaft-strong)" }} />}
    {id === "E" && (
      <>
        <path d="M18 15.5V29" strokeWidth={3} style={{ stroke: "var(--dig-shaft-strong)" }} />
        <path d="M30 15.5V29" strokeWidth={3} strokeDasharray="3.5 2.5" style={{ stroke: "var(--dig-shaft-weak)" }} />
      </>
    )}
  </svg>
);

/** The whole idea of the product in one drawing. */
export const HowItReadsArt: React.FC = () => (
  <svg viewBox="0 0 440 180" className="block w-full h-auto" role="img" aria-label="A cross-section: your code on top, a shaft reaching the tests below it, and undug ground beneath">
    <defs>
      <pattern id="start-hatch" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={9} strokeWidth={2} style={{ stroke: "var(--dig-hatch)" }} />
      </pattern>
    </defs>
    <rect x={0} y={0} width={440} height={56} rx={6} style={{ fill: "var(--dig-stratum-a)" }} />
    <path d="M176 18H264L272 38H184Z" style={{ fill: "var(--dig-modified)", stroke: "var(--status-modified-fg)" }} />
    <rect x={0} y={62} width={440} height={56} rx={6} style={{ fill: "var(--dig-test)" }} />
    <rect x={0} y={124} width={440} height={56} rx={6} fill="url(#start-hatch)" />
    <text x={16} y={33} className="start-art-label">Your code</text>
    <text x={16} y={95} className="start-art-label">Your tests</text>
    <rect x={8} y={140} width={150} height={24} rx={4} style={{ fill: "var(--surface-ground)" }} />
    <text x={16} y={157} className="start-art-label">What can't be seen</text>
    <path d="M224 30V84" strokeWidth={6} style={{ stroke: "var(--dig-shaft-strong)" }} />
    <path d="M224 80 236 92 224 104 212 92Z" style={{ fill: "var(--dig-shaft-strong)" }} />
  </svg>
);
