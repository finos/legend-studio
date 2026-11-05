/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CaretDownIcon, CaretRightIcon } from '@finos/legend-art';
import type {
  CodeEditorRange,
  CodeEditorTextEdit,
} from '@finos/legend-lego/code-editor';
import { useState } from 'react';
import {
  CUBE_OUTLINE_LABEL,
  CUBE_PRECEDENCE_TRAP_EXPLANATIONS,
  getCubePrecedenceFixLabel,
  getCubePrecedenceTrapTitle,
  getTypeFamilyLabel,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeCodeEdit,
  type CubeCodeRange,
  type CubeExpressionOutline,
  type CubeOutlineColumn,
  type CubeOutlinePart,
  type CubeOutlineRow,
  type CubePrecedenceTrap,
  CubeOutlinePartKind,
  getCubeCoalesceEdit,
  getCubeEmptyDefault,
  getCubeOutlineRows,
  getCubePrecedenceFixEdits,
  getCubeToOneEdit,
} from '../../graph-manager/CubeExpressionOutline.js';
import type { CubeFunctionCatalogue } from '../../graph-manager/CubeFunctionCatalogue.js';

// An expression's outline under its code (EXPRESSION-EDITOR.md, round 2):
// a warning, with its fix, where Pure's precedence reads the code other
// than it was likely meant, and the parts as Pure reads them, each with
// what it is to the part it is in and the kind of value it gives, a value
// that can be empty where one is needed flagged with its fixes. Pointing at
// a part highlights its code.

/** A range of the code as the code editor counts it: its end column excluded */
export const toCodeEditorRange = (range: CubeCodeRange): CodeEditorRange => ({
  startLineNumber: range.startLine,
  startColumn: range.startColumn,
  endLineNumber: range.endLine,
  endColumn: range.endColumn + 1,
});

/** Edits of the code as the code editor writes them: each at its position */
export const toCodeEditorEdits = (
  edits: readonly CubeCodeEdit[],
): CodeEditorTextEdit[] =>
  edits.map(({ at, text }) => ({
    range: {
      startLineNumber: at.line,
      startColumn: at.column,
      endLineNumber: at.line,
      endColumn: at.column,
    },
    text,
  }));

/** A part as the outline writes it */
const textOf = (part: CubeOutlinePart): string => {
  switch (part.kind) {
    case CubeOutlinePartKind.CALL:
      return `${part.isArrow ? '->' : ''}${part.label}()`;
    default:
      return part.label;
  }
};

/** The warning where Pure's precedence reads the code other than likely meant, with the parentheses that fix it */
export const CubePrecedenceWarning = (props: {
  traps: readonly CubePrecedenceTrap[];
  disabled: boolean;
  onEdit: (edits: readonly CubeCodeEdit[]) => void;
}) => {
  const { traps, disabled, onEdit } = props;
  const [first] = traps;
  if (!first) {
    return null;
  }
  return (
    <div
      aria-label="Precedence warning"
      className="flex flex-col gap-1 rounded-sm border border-[var(--color-status-warn)] bg-[var(--color-status-warn-bg)] p-2 text-sm"
    >
      {traps.map((trap) => (
        <div key={`${trap.kind}:${trap.readAs}`} className="flex flex-col">
          <span className="font-mono font-semibold text-[var(--color-status-warn)]">
            {getCubePrecedenceTrapTitle(trap.readAs)}
          </span>
          <span className="text-[var(--color-text-secondary)]">
            {CUBE_PRECEDENCE_TRAP_EXPLANATIONS[trap.kind]}
          </span>
        </div>
      ))}
      <div>
        <button
          className="rounded-sm border border-[var(--color-status-warn)] px-2 py-0.5 font-mono hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
          disabled={disabled}
          title="Put in the parentheses, as Pure would then read it"
          onClick={() => onEdit(getCubePrecedenceFixEdits(traps))}
        >
          {getCubePrecedenceFixLabel(traps.map((trap) => trap.meant))}
        </button>
      </div>
    </div>
  );
};

const CubeOutlineRowView = (props: {
  row: CubeOutlineRow;
  disabled: boolean;
  onEdit: (edits: readonly CubeCodeEdit[]) => void;
  onPoint: (range: CubeCodeRange | undefined) => void;
}) => {
  const { row, disabled, onEdit, onPoint } = props;
  const { part, family } = row;
  const toOne = row.needsValue ? getCubeToOneEdit(part) : undefined;
  const coalesce = row.needsValue
    ? getCubeCoalesceEdit(part, family)
    : undefined;
  const fallback = getCubeEmptyDefault(family);
  const type = family !== undefined ? getTypeFamilyLabel(family) : undefined;
  return (
    <li
      className="flex flex-wrap items-center gap-x-2 rounded-sm px-1 hover:bg-[var(--color-bg-hover)]"
      style={{ paddingLeft: `${row.depth * 16 + 4}px` }}
      onMouseEnter={() => onPoint(part.extent)}
      onMouseLeave={() => onPoint(undefined)}
    >
      {row.role !== undefined && (
        <span className="text-xs text-[var(--color-text-muted)]">
          {row.role}
        </span>
      )}
      <span className="font-mono">{textOf(part)}</span>
      {type !== undefined && (
        <span className="ml-auto text-xs text-[var(--color-text-secondary)]">
          {type}
        </span>
      )}
      {row.needsValue && (
        <>
          <span
            className="rounded-sm border border-[var(--color-status-warn)] px-1 text-xs text-[var(--color-status-warn)]"
            title={CUBE_OUTLINE_LABEL.CAN_BE_EMPTY_TITLE}
          >
            {CUBE_OUTLINE_LABEL.CAN_BE_EMPTY}
          </span>
          {toOne && (
            <button
              className="rounded-sm border border-[var(--color-border-subtle)] px-1 font-mono text-xs hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
              title={CUBE_OUTLINE_LABEL.TO_ONE_TITLE}
              disabled={disabled}
              onClick={() => onEdit([toOne])}
            >
              {CUBE_OUTLINE_LABEL.TO_ONE}
            </button>
          )}
          {coalesce && fallback !== undefined && (
            <button
              className="rounded-sm border border-[var(--color-border-subtle)] px-1 font-mono text-xs hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
              title={CUBE_OUTLINE_LABEL.COALESCE_TITLE(fallback)}
              disabled={disabled}
              onClick={() => onEdit([coalesce])}
            >
              {CUBE_OUTLINE_LABEL.COALESCE(fallback)}
            </button>
          )}
        </>
      )}
    </li>
  );
};

/**
 * An expression's outline, shown at once where a part can be empty where a
 * value is needed, else behind a toggle
 */
export const CubeExpressionOutlineView = (props: {
  outline: CubeExpressionOutline;
  columns: readonly CubeOutlineColumn[];
  catalogue: CubeFunctionCatalogue | undefined;
  /** What the outline is of, e.g. `Expression 1`, naming its toggle and list */
  name: string;
  disabled: boolean;
  onEdit: (edits: readonly CubeCodeEdit[]) => void;
  onPoint: (range: CubeCodeRange | undefined) => void;
}) => {
  const { outline, columns, catalogue, name, disabled, onEdit, onPoint } =
    props;
  const rows = getCubeOutlineRows(outline, columns, catalogue);
  const [shown, setShown] = useState<boolean | undefined>(undefined);
  const isShown = shown ?? rows.some((row) => row.needsValue);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <button
        className="flex items-center gap-1 self-start text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        aria-expanded={isShown}
        aria-label={`${CUBE_OUTLINE_LABEL.TITLE} of ${name}`}
        title={isShown ? CUBE_OUTLINE_LABEL.HIDE : CUBE_OUTLINE_LABEL.SHOW}
        onClick={() => setShown(!isShown)}
      >
        {isShown ? <CaretDownIcon /> : <CaretRightIcon />}
        {CUBE_OUTLINE_LABEL.TITLE}
        <span className="text-xs text-[var(--color-text-muted)]">
          {CUBE_OUTLINE_LABEL.DESCRIPTION}
        </span>
      </button>
      {isShown && (
        <ul
          aria-label={`${CUBE_OUTLINE_LABEL.TITLE} of ${name}`}
          className="flex flex-col rounded-sm border border-[var(--color-border-subtle)] py-1"
          onMouseLeave={() => onPoint(undefined)}
        >
          {rows.map((row, index) => (
            <CubeOutlineRowView
              // the parts in order: a part's place in the outline is its identity
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              row={row}
              disabled={disabled}
              onEdit={onEdit}
              onPoint={onPoint}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
