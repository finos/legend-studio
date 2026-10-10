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

import type { SchemaColumn, SchemaDiff } from '@finos/legend-cube';
import { CubeTableFlag } from '../graph-manager/CubeEngine.js';

// The page's own text and settings; validation messages live in the core's
// CubeMessages (PLAN §4.11)

/** The rows a run returns by default (PLAN §9, Settled before M1.8) */
export const DEFAULT_ROW_LIMIT = 1000;
/** Above this, the row limit input warns that the tab may slow down; there is no hard cap */
export const ROW_LIMIT_WARNING_THRESHOLD = 100_000;
/** At most this many undo steps are kept */
export const MAX_UNDO_STEPS = 100;

export enum LEGEND_CUBE_USER_DATA_KEY {
  ROW_LIMIT = 'legend-cube.row-limit',
  PALETTE_COLLAPSED = 'legend-cube.palette-collapsed',
  /** The warehouse the viewer last picked for a data product cube (PLAN §6.8) */
  DATA_PRODUCT_WAREHOUSE = 'legend-cube.data-product-warehouse',
}

export const UNSAVED_CUBE_NAME = 'Unsaved Query';
/** Why a source is disabled on a cube: it reads database tables or data products, never both (PLAN §6.8) */
export const OTHER_SOURCE_KIND_TITLE =
  "This cube's sources are of another kind: a cube reads database tables or data products, never both";

/** Why no source can be added to a cube: the host doesn't serve the cube's kind of source (PLAN §6.8) */
export const UNSERVED_SOURCE_KIND_TITLE =
  "This Legend deployment doesn't serve this cube's kind of source, so no source can be added to it";

/** Why a cube's edits are disabled: it was saved by a newer version (Settled before M1.8) */
export const READ_ONLY_CUBE_TITLE =
  "This cube was saved by a newer version of Legend Cube, so it can't be changed or exported";
/** How a SQL NULL shows in the grid, distinct from an empty string */
export const NULL_CELL_TEXT = '(null)';

/** Pending labels: lower-case gerunds, shown as they are (spec §17.13) */
export enum CUBE_PENDING_LABEL {
  LOADING_MODEL = 'loading model',
  RESOLVING_SOURCE = 'resolving source',
  EXECUTING_QUERY = 'executing query',
  RENDERING_QUERY = 'rendering query',
  REFRESHING_SOURCE = 'refreshing source',
}

export const getRowLimitError = (text: string): string | undefined => {
  const value = Number(text.trim());
  return text.trim() === '' || !Number.isSafeInteger(value) || value < 1
    ? 'The row limit must be a whole number of at least 1.'
    : undefined;
};

export const getTruncationMessage = (rowLimit: number): string =>
  `Showing the first ${rowLimit.toLocaleString('en-US')} rows; the query returned more.`;

/** How the picker shows a table's problem, and why (PLAN §6.2.6) */
export const CUBE_TABLE_FLAG_LABELS: Readonly<
  Record<CubeTableFlag, { label: string; description: string }>
> = {
  [CubeTableFlag.UNAVAILABLE]: {
    label: 'unavailable',
    description: "A column's type (BINARY or VARBINARY) can't be read by Cube.",
  },
  [CubeTableFlag.LENGTH_UNKNOWN]: {
    label: 'length unknown',
    description: 'A CHAR column: its length is not known to Cube.',
  },
  [CubeTableFlag.TYPE_UNKNOWN]: {
    label: 'type unknown',
    description: "A column's type (OTHER or ARRAY) is not known to Cube.",
  },
};

/** A column's type as the editors show it: its display name, `?` when it takes NULL, e.g. `Varchar(5)?` */
export const getColumnTypeLabel = (column: SchemaColumn): string =>
  `${column.type.displayName}${column.nullable ? '?' : ''}`;

const listColumns = (columns: readonly SchemaColumn[]): string =>
  columns.map((column) => column.name).join(', ');

/** Why Execute (and Show Pure) can't run, one reason a line, for a tooltip */
export const formatDisabledReasons = (reasons: readonly string[]): string =>
  reasons.map((reason) => `• ${reason}`).join('\n');

/** A source's changes since the cube was saved, as its drift warning lists them */
export const getSchemaChangeList = (diff: SchemaDiff): string => {
  const changes = [
    ...(diff.added.length ? [`added ${listColumns(diff.added)}`] : []),
    ...(diff.removed.length ? [`removed ${listColumns(diff.removed)}`] : []),
    ...(diff.changed.length
      ? [
          `changed ${diff.changed
            .map(
              (change) =>
                `${change.after.name} (${getColumnTypeLabel(change.before)} to ${getColumnTypeLabel(change.after)})`,
            )
            .join(', ')}`,
        ]
      : []),
    ...(diff.reordered ? ['reordered its columns'] : []),
  ];
  return changes.join('; ');
};

/** The warning on a source whose table changed since the cube was saved; the table's new columns are used */
export const getSchemaDriftWarning = (diff: SchemaDiff): string =>
  `This table changed since the cube was saved: ${getSchemaChangeList(diff)}`;

/** Why the Sort editor's picker doesn't offer a column, after its type */
export const CUBE_SORT_COLUMN_DISABLED_REASON = {
  NOT_SORTABLE: "can't be sorted",
  TAKEN: 'already sorted on',
};

/** Why the grid's quick actions (spec §12.4) can't be used */
export const CUBE_QUICK_ACTION_DISABLED_REASON = {
  STALE_ROWS:
    'Execute again: these rows are from an earlier version of the query.',
  RUNNING: 'Wait for the run to finish.',
  EDITING:
    "Close the node editor first: these rows don't show the changes in it.",
  UNREADABLE_VALUE: "This value can't be used in a filter.",
  notSortable: (typeName: string): string =>
    `Values of type ${typeName} can't be sorted.`,
  notGroupable: (typeName: string): string =>
    `Values of type ${typeName} can't be grouped.`,
  notComparable: (typeName: string): string =>
    `Values of type ${typeName} can't be compared.`,
};

/** Beside a condition comparing a floating-point column for equality (R133) */
export const FILTER_FLOAT_COMPARISON_HINT =
  'exact comparison on floating-point columns may not match';

/** The Filter and Join editors' warning on a column that can hold both dates and timestamps (PLAN §11.5) */
export const DATE_OR_TIMESTAMP_WARNING =
  'this column can hold both dates and timestamps, as Convert types made it a Date: a date reads as midnight, so it matches a timestamp only at midnight';

/** The Filter editor's note on NULLs (D4): negated conditions keep them */
export const FILTER_NULL_NOTE =
  'A negated condition (is not, does not contain, is not in list of, Not) also keeps the rows where its column is empty (NULL).';

/** Why the node editor closed without applying its edits */
export enum CUBE_EDITOR_CLOSED_REASON {
  NODE_CHANGED = 'nodeChanged',
  NODE_REMOVED = 'nodeRemoved',
  CUBE_REPLACED = 'cubeReplaced',
  CANNOT_APPLY = 'cannotApply',
}

/** The notice of a node editor that closed by itself, dropping its edits (M1.8b) */
export const getEditorClosedNotice = (
  nodeId: string,
  reason: CUBE_EDITOR_CLOSED_REASON,
): string => {
  const cause =
    reason === CUBE_EDITOR_CLOSED_REASON.NODE_CHANGED
      ? `${nodeId} changed`
      : reason === CUBE_EDITOR_CLOSED_REASON.NODE_REMOVED
        ? `${nodeId} was removed`
        : reason === CUBE_EDITOR_CLOSED_REASON.CANNOT_APPLY
          ? `The query can't take the changes to ${nodeId}`
          : 'Another cube was opened';
  return `${cause}, so the editor of ${nodeId} closed without applying its changes.`;
};

/** The warning on a source with saved columns that the engine couldn't type again */
export const getSourceRecheckWarning = (firstLine: string): string =>
  `Could not re-check this table, so it keeps its saved columns: ${firstLine}`;

/** Under the Slice editor's fields: the range counts from 0, and leaves out its stop row (D5) */
export const SLICE_RANGE_HINT =
  'Rows count from 0: the start row is kept, the stop row is not.';

/** The Distinct editor's text: it has nothing to set (spec §17.6) */
export const DISTINCT_EDITOR_TEXT =
  'Keeps one row of each set of identical rows. There is nothing to set.';

/** The Concat editor's text: what Concat requires of its inputs (PLAN §11.5) */
export const CONCAT_EDITOR_TEXT =
  'Gives the rows of both inputs, keeping duplicates, in no particular order. Both must have the same columns, matched by position: the same names, in the same order, with the same types.';

/** What the Concat editor's Convert types setting does (PLAN §11.5, Q5) */
export const CONCAT_CONVERT_TYPES_HINT =
  'Converts types that differ within numbers, strings or dates to the type they share, e.g. Varchar(15) and Varchar(40) to String.';

/** What the Concat editor says when Convert types would make its inputs match (PLAN §11.5, Q5) */
export const CONCAT_CONVERT_FIX_TEXT =
  'The types differ, but converting them to the type they share makes the inputs match:';
export const CONCAT_CONVERT_FIX_TITLE = 'Tick Convert types; Apply stores it';

/** What the Concat editor's Rename autofix says it will do (PLAN §11.5, Q6) */
export const CONCAT_RENAME_FIX_TEXT =
  "The second input's columns can take the first input's names:";
export const CONCAT_RENAME_FIX_TITLE =
  "Add a Rename before the second input that gives these columns the first input's names, as one step to undo";

/** What the Concat editor's Restrict autofix says it will do, for the input it drops columns from (PLAN §11.5, Q6) */
export const getConcatRestrictFixText = (
  input: string,
  other: string,
): string =>
  `The ${input} input has columns the ${other} doesn't, which can be dropped:`;
export const getConcatRestrictFixTitle = (
  input: string,
  other: string,
): string =>
  `Add a Restrict before the ${input} input that keeps only the ${other} input's columns, as one step to undo`;

/** The Concat editor's warning on columns whose real type Cube doesn't know (PLAN §8.7) */
export const getConcatUntypedWarning = (columns: readonly string[]): string =>
  `${CUBE_TABLE_FLAG_LABELS[CubeTableFlag.TYPE_UNKNOWN].label}: Cube doesn't know the real type of ${columns.join(', ')}, so the database may not combine the inputs' values`;

/** Why the Group editor can't take a column as a key (PLAN §11.5) */
export const CUBE_GROUP_COLUMN_DISABLED_REASON = "can't be grouped";

/** What the Group editor says about its aggregations (PLAN §11.5; Count counts non-empty values, D4) */
export const GROUP_EDITOR_NOTES = [
  'Count counts the values that are not empty; Count Rows counts every row.',
  'Distinct Value is the value when the group has exactly one distinct value that is not empty, and empty otherwise.',
  'With no group column, the result is one row, even when there are no rows.',
];

/** Under the Rename editor's rows: the rule for new column names (PLAN §11.4) */
export const COLUMN_NAME_RULES_HINT =
  'Names can\'t start or end with a space, or contain " or \\ or control characters, and have at most 128 characters.';

/**
 * A node type's label as the node editor's title shows it, each word
 * capitalised (QUESTIONS.md U1(a)), e.g. 'Take First <x> Rows'; the registry
 * keeps its own wording
 */
export const toEditorTitle = (label: string): string =>
  label.replace(/(?<=^|\s)[a-z]/gu, (letter) => letter.toUpperCase());

/** The source dialog's body until a tab is chosen, opened from the empty canvas (spec §17.8, U4(b)) */
export const SELECT_SOURCE_TYPE_PROMPT = 'Select source type above';
