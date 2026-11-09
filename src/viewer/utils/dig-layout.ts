/**
 * Change Archaeologist — The Dig layout
 *
 * Turns a DigModel into SVG coordinates at a given pixel width. Text is drawn
 * at true size, so narrow panes reflow instead of shrinking the type.
 */

import type { DigCard, DigColumn, DigFault, DigModel, DigRow, DigShaft } from "../types/dig.js";

export const DIG_MIN_WIDTH = 760;
const MARGIN = 20;
const CHANNEL = 160;
const ROW_HEIGHT = 25;
const CODE_TOP = 62;
const DATUM_GAP = 34;
const LANE_GAP = 20;
const BAND_HEIGHT = 25;
const CARD_HEIGHT = 74;
const CARD_MIN_WIDTH = 210;
const CARD_GAP = 12;
const FILE_GAP = 22;
const UNKNOWN_HEIGHT = 62;
export const MONO_CHAR_WIDTH = 7.25;

export interface LaidOutRow {
  readonly row: DigRow;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly striped: boolean;
}

export interface LaidOutColumn {
  readonly column: DigColumn;
  readonly x: number;
  readonly width: number;
  readonly maxChars: number;
  readonly rows: readonly LaidOutRow[];
}

export interface LaidOutFault {
  readonly fault: DigFault;
  readonly points: string;
  readonly shaftX: number;
  readonly shaftY: number;
}

export interface LaidOutShaft {
  readonly shaft: DigShaft;
  readonly path: string;
  readonly endX: number;
  readonly endY: number;
  readonly labelX: number;
  readonly labelY: number;
}

export interface LaidOutProbe {
  readonly faultId: string;
  readonly x: number;
  readonly startY: number;
  readonly endY: number;
}

export interface LaidOutCard {
  readonly card: DigCard;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly maxChars: number;
}

export interface LaidOutFile {
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly maxChars: number;
  readonly cards: readonly LaidOutCard[];
}

export interface DigLayout {
  readonly width: number;
  readonly height: number;
  readonly codeHeight: number;
  readonly codeTop: number;
  readonly base: LaidOutColumn;
  readonly head: LaidOutColumn;
  readonly faults: readonly LaidOutFault[];
  readonly shafts: readonly LaidOutShaft[];
  readonly probes: readonly LaidOutProbe[];
  readonly datumY: number;
  readonly testTop: number;
  readonly testEmptyHeight: number;
  readonly files: readonly LaidOutFile[];
  readonly unknownTop: number;
  readonly unknownHeight: number;
}

function layoutColumn(column: DigColumn, x: number, width: number): LaidOutColumn {
  const maxChars = Math.floor((width - 48) / MONO_CHAR_WIDTH);
  const rows = column.rows.map((row, index) => {
    const textLength = row.kind === "line" ? Math.min(row.line.text.length, maxChars) : 22;
    return {
      row,
      x,
      y: CODE_TOP + index * ROW_HEIGHT,
      width: Math.min(width, 52 + textLength * MONO_CHAR_WIDTH),
      height: ROW_HEIGHT - 2,
      striped: index % 2 === 1,
    };
  });
  return { column, x, width, maxChars, rows };
}

/** The row holding a source line. A compressed line maps to its gap row. */
function rowIndexForLine(column: DigColumn, line: number): number {
  const index = column.rows.findIndex((row) =>
    row.kind === "line" ? row.line.number === line : line >= row.from && line <= row.to
  );
  if (index !== -1) return index;
  const first = column.rows[0];
  const firstNumber = first?.kind === "line" ? first.line.number : (first?.from ?? line);
  return line < firstNumber ? 0 : Math.max(0, column.rows.length - 1);
}

interface VerticalRange {
  readonly top: number;
  readonly bottom: number;
}

function rangeFor(column: DigColumn, lines: readonly [number, number]): VerticalRange {
  const start = rowIndexForLine(column, lines[0]);
  const end = rowIndexForLine(column, lines[1]);
  return { top: CODE_TOP + start * ROW_HEIGHT, bottom: CODE_TOP + (end + 1) * ROW_HEIGHT - 2 };
}

/** A side with no matching lines collapses to a point opposite the other side. */
function pinchAt(column: DigColumn, otherTop: number, codeBottom: number): VerticalRange {
  const lastRowTop = CODE_TOP + Math.max(0, column.rows.length - 1) * ROW_HEIGHT;
  const y = column.state === "PRESENT" ? Math.min(otherTop, lastRowTop) : Math.min(otherTop, codeBottom);
  return { top: y, bottom: y };
}

function shaftPath(x: number, y: number, driftY: number, toX: number, toY: number): string {
  if (Math.abs(x - toX) < 1) return `M${x} ${y}V${toY}`;
  const radius = 10;
  const direction = toX > x ? 1 : -1;
  return [
    `M${x} ${y}`,
    `V${driftY - radius}`,
    `Q${x} ${driftY} ${x + direction * radius} ${driftY}`,
    `H${toX - direction * radius}`,
    `Q${toX} ${driftY} ${toX} ${driftY + radius}`,
    `V${toY}`,
  ].join("");
}

export function layoutDig(model: DigModel, availableWidth: number): DigLayout {
  const codeWidth = Math.max(DIG_MIN_WIDTH, Math.floor(availableWidth) || 980);
  const columnWidth = (codeWidth - MARGIN * 2 - CHANNEL) / 2;
  const headX = codeWidth - MARGIN - columnWidth;

  const base = layoutColumn(model.base, MARGIN, columnWidth);
  const head = layoutColumn(model.head, headX, columnWidth);
  const rowCount = Math.max(base.rows.length, head.rows.length, 3);
  const codeBottom = CODE_TOP + rowCount * ROW_HEIGHT;

  const channelLeft = MARGIN + columnWidth + 2;
  const channelRight = headX - 2;
  const channelInset = 30;
  const laneStep = (channelRight - channelLeft - channelInset * 2) / (model.faults.length + 1);

  const faults: LaidOutFault[] = model.faults.map((fault, index) => {
    let before = fault.beforeLines && model.base.state === "PRESENT" ? rangeFor(model.base, fault.beforeLines) : null;
    let after = fault.afterLines && model.head.state === "PRESENT" ? rangeFor(model.head, fault.afterLines) : null;
    if (!before && !after) {
      before = { top: CODE_TOP, bottom: CODE_TOP + ROW_HEIGHT - 2 };
      after = before;
    }
    const left = before ?? pinchAt(model.base, (after as VerticalRange).top, codeBottom);
    const right = after ?? pinchAt(model.head, (before as VerticalRange).top, codeBottom);
    return {
      fault,
      points: `${channelLeft},${left.top} ${channelRight},${right.top} ${channelRight},${right.bottom} ${channelLeft},${left.bottom}`,
      shaftX: channelLeft + channelInset + laneStep * (index + 1),
      shaftY: Math.min((left.top + left.bottom + right.top + right.bottom) / 4, codeBottom - 4),
    };
  });
  const faultGeometry = new Map(faults.map((f) => [f.fault.id, f]));

  const laneCount = Math.max(1, model.shafts.length + model.unprobedFaultIds.length);
  const datumY = codeBottom + DATUM_GAP;
  const openEndY = datumY + 24 + laneCount * LANE_GAP;
  const testTop = openEndY + 20;

  const cardTotal = model.testFiles.reduce((sum, file) => sum + Math.max(1, file.cards.length), 0);
  const fileTotal = model.testFiles.length;
  const spaceForGaps = (cardTotal - fileTotal) * CARD_GAP + Math.max(0, fileTotal - 1) * FILE_GAP;
  const fitted = cardTotal > 0 ? (codeWidth - MARGIN * 2 - spaceForGaps) / cardTotal : 0;
  const cardWidth = Math.max(CARD_MIN_WIDTH, Math.min(fitted, 460));
  const cardsY = testTop + BAND_HEIGHT + 6;

  let cursorX = MARGIN;
  const files: LaidOutFile[] = model.testFiles.map((file) => {
    const count = Math.max(1, file.cards.length);
    const width = count * cardWidth + (count - 1) * CARD_GAP;
    const cards = file.cards.map((card, index) => ({
      card,
      x: cursorX + index * (cardWidth + CARD_GAP),
      y: cardsY,
      width: cardWidth,
      height: CARD_HEIGHT,
      maxChars: Math.floor((cardWidth - 20) / MONO_CHAR_WIDTH),
    }));
    const laidOut: LaidOutFile = {
      path: file.path,
      x: cursorX,
      y: testTop,
      width,
      height: BAND_HEIGHT - 2,
      maxChars: Math.max(8, Math.floor((width - 20) / MONO_CHAR_WIDTH)),
      cards,
    };
    cursorX += width + FILE_GAP;
    return laidOut;
  });

  const cardCenters = new Map(
    files.flatMap((file) => file.cards.map((c) => [c.card.id, c.x + c.width / 2] as const))
  );
  const fileCenters = new Map(files.map((file) => [file.path, file.x + file.width / 2]));

  // Several shafts can land on one target, so they sit side by side, centred on it.
  const targetKey = (shaft: DigShaft) => `${shaft.end}:${shaft.testChangeId ?? shaft.testFilePath ?? shaft.faultId}`;
  const totalPerTarget = new Map<string, number>();
  model.shafts.forEach((s) => totalPerTarget.set(targetKey(s), (totalPerTarget.get(targetKey(s)) ?? 0) + 1));
  const seenPerTarget = new Map<string, number>();

  // Shafts leaving one fault also sit side by side, so each stays visible and clickable.
  const totalPerFault = new Map<string, number>();
  model.shafts.forEach((s) => totalPerFault.set(s.faultId, (totalPerFault.get(s.faultId) ?? 0) + 1));
  const seenPerFault = new Map<string, number>();

  const shafts: LaidOutShaft[] = model.shafts.flatMap((shaft, lane) => {
    const fault = faultGeometry.get(shaft.faultId);
    if (!fault) return [];

    const seenFromFault = seenPerFault.get(shaft.faultId) ?? 0;
    seenPerFault.set(shaft.faultId, seenFromFault + 1);
    const start = {
      shaftX: fault.shaftX + (seenFromFault - ((totalPerFault.get(shaft.faultId) ?? 1) - 1) / 2) * 12,
      shaftY: fault.shaftY,
    };

    const key = targetKey(shaft);
    const seen = seenPerTarget.get(key) ?? 0;
    seenPerTarget.set(key, seen + 1);
    const spread = (seen - ((totalPerTarget.get(key) ?? 1) - 1) / 2) * 14;

    let endX = start.shaftX;
    let endY = openEndY;
    if (shaft.end === "ASSERTION" && shaft.testChangeId) {
      endX = cardCenters.get(shaft.testChangeId) ?? endX;
      endY = cardsY;
    } else if (shaft.end === "FILE" && shaft.testFilePath) {
      endX = fileCenters.get(shaft.testFilePath) ?? endX;
      endY = testTop;
    }
    endX += spread;

    const driftY = datumY + 12 + lane * LANE_GAP;
    const longDrift = Math.abs(endX - start.shaftX) > 90;
    return [
      {
        shaft,
        path: shaftPath(start.shaftX, start.shaftY, driftY, endX, endY),
        endX,
        endY,
        labelX: longDrift ? (endX + start.shaftX) / 2 : Math.max(endX, start.shaftX) + 52,
        labelY: longDrift ? driftY : driftY + 4,
      },
    ];
  });

  const probes: LaidOutProbe[] = model.unprobedFaultIds.flatMap((faultId) => {
    const start = faultGeometry.get(faultId);
    return start ? [{ faultId, x: start.shaftX, startY: start.shaftY, endY: datumY + 18 }] : [];
  });

  const testEmptyHeight = 50;
  const testBottom = files.length > 0 ? cardsY + CARD_HEIGHT : testTop + testEmptyHeight;
  const unknownTop = testBottom + 30;

  return {
    width: Math.max(codeWidth, cursorX - FILE_GAP + MARGIN),
    height: unknownTop + UNKNOWN_HEIGHT + 6,
    codeHeight: rowCount * ROW_HEIGHT,
    codeTop: CODE_TOP,
    base,
    head,
    faults,
    shafts,
    probes,
    datumY,
    testTop,
    testEmptyHeight,
    files,
    unknownTop,
    unknownHeight: UNKNOWN_HEIGHT,
  };
}

export function truncate(text: string | null | undefined, maxChars: number): string {
  const value = text ?? "";
  return value.length > maxChars ? `${value.slice(0, Math.max(0, maxChars - 1))}…` : value;
}
