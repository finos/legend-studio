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

import {
  type SchemaColumn,
  type SchemaDiff,
  TypeFamily,
} from '@finos/legend-cube';
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
  /** Server-side or local (PLAN §11.10) */
  GRID_MODE = 'legend-cube.grid-mode',
  /** Engine requests sent uncompressed, for the browser's Network tab (PLAN §11.16) */
  UNCOMPRESSED_REQUESTS = 'legend-cube.uncompressed-requests',
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

/** What the Runs panel calls a run (PLAN §11.10, §11.16); a fetch of the grid's rows is described by its level */
export const CUBE_RUN_LABEL = {
  EXECUTE: 'Execute',
  EXPORT_CSV: 'Export CSV',
  pivotValues: (column: string): string => `Values of ${column}`,
};

/**
 * Above a run's Pure (PLAN §11.16): unlike Show Pure, it shows the limit a
 * grid run adds, one more than the row limit, to tell whether there are more
 */
export const CUBE_RUN_PURE_NOTE =
  'As it ran, with any row limit Cube added to it.';

/** Pending labels: lower-case gerunds, shown as they are (spec §17.13) */
export enum CUBE_PENDING_LABEL {
  LOADING_MODEL = 'loading model',
  RESOLVING_SOURCE = 'resolving source',
  EXECUTING_QUERY = 'executing query',
  FETCHING_ROWS = 'fetching rows',
  EXPORTING_CSV = 'exporting CSV',
  RENDERING_QUERY = 'rendering query',
  REFRESHING_SOURCE = 'refreshing source',
  CHECKING_EXPRESSIONS = 'checking expressions',
}

/**
 * Why a row limit can't be taken: the number its text holds
 * (`parseWholeNumberText`, so `0x10`, `1e3` and `1.0` hold none, PLAN
 * §11.14) isn't a safe whole number of at least 1
 */
export const getRowLimitError = (
  value: number | undefined,
): string | undefined =>
  value === undefined || !Number.isSafeInteger(value) || value < 1
    ? 'The row limit must be a whole number of at least 1.'
    : undefined;

export const getTruncationMessage = (rowLimit: number): string =>
  `Showing the first ${rowLimit.toLocaleString('en-US')} rows; the query returned more.`;

/** In server-side mode, when a drill-down level or a sorted level was cut at the row limit (PLAN §11.10) */
export const getLevelTruncationMessage = (rowLimit: number): string =>
  `Some levels show only their first ${rowLimit.toLocaleString('en-US')} rows or groups.`;

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

/** A column's exact type: its display name, `?` when it takes NULL, e.g. `Varchar(5)?`; for hover and type messages */
export const getExactColumnTypeLabel = (column: SchemaColumn): string =>
  `${column.type.displayName}${column.nullable ? '?' : ''}`;

/** The kind of value a type family holds, as the editors name it (the review of the demo, 2026-10-13) */
const TYPE_FAMILY_LABELS: Partial<Record<TypeFamily, string>> = {
  [TypeFamily.BOOLEAN]: 'True or false',
  [TypeFamily.STRING]: 'Text',
  [TypeFamily.INTEGER]: 'Whole number',
  [TypeFamily.FLOAT]: 'Number',
  [TypeFamily.DECIMAL]: 'Decimal',
  [TypeFamily.NUMBER]: 'Number',
  [TypeFamily.STRICT_DATE]: 'Date',
  [TypeFamily.DATETIME]: 'Date and time',
  [TypeFamily.DATE]: 'Date',
  [TypeFamily.STRICT_TIME]: 'Time',
  [TypeFamily.VARIANT]: 'Variant',
};

/**
 * A column's type as the editors show it: the kind of value, and whether it
 * is optional (can be empty), e.g. `Text, optional`; an enumeration, or a
 * type Cube doesn't know, by its name. The exact type
 * (`getExactColumnTypeLabel`) is on hover.
 */
export const getColumnTypeLabel = (column: SchemaColumn): string =>
  `${TYPE_FAMILY_LABELS[column.type.family] ?? column.type.displayName}${
    column.nullable ? ', optional' : ''
  }`;

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
                `${change.after.name} (${getExactColumnTypeLabel(change.before)} to ${getExactColumnTypeLabel(change.after)})`,
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
/** Why a Variant cell's Open JSON can't be used (PLAN §11.20) */
export const CUBE_JSON_DISABLED_REASON = {
  NOT_A_ROW: "A group row's cell holds no row's document.",
  EMPTY: 'This cell is empty.',
};

export const CUBE_QUICK_ACTION_DISABLED_REASON = {
  STALE_ROWS:
    'Execute again: these rows are from an earlier version of the query.',
  RUNNING: 'Wait for the run to finish.',
  EDITING:
    "Close the node editor first: these rows don't show the changes in it.",
  UNREADABLE_VALUE: "This value can't be used in a filter.",
  /** On a group row's cell that holds its aggregation (PLAN §11.10) */
  AGGREGATE_VALUE:
    "This cell holds its group's aggregation, not a row's value, so it can't be used in a filter.",
  /** On a group row's cell that shows nothing */
  NO_VALUE: 'This cell has no value to filter by.',
  notSortable: (typeName: string): string =>
    `Values of type ${typeName} can't be sorted.`,
  notGroupable: (typeName: string): string =>
    `Values of type ${typeName} can't be grouped.`,
  notComparable: (typeName: string): string =>
    `Values of type ${typeName} can't be compared.`,
};

/** Why 'Format Column' can't be used on a column (spec §13.1) */
export const CUBE_FORMAT_NOT_A_NUMBER = 'Only number columns can be formatted.';

/** Why 'Drilldown by' can't be used on a column (PLAN §11.10) */
export const CUBE_DRILLDOWN_BLOCKER = {
  ALREADY_A_LEVEL: 'The results already drill down by this column.',
  notGroupable: (typeName: string): string =>
    `Values of type ${typeName} can't be grouped.`,
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

/** What the Concat editor says when a fix would make its inputs match only with Convert types ticked (PLAN §11.5) */
export const CONCAT_FIX_NEEDS_CONVERT_TEXT =
  'With Convert types ticked, Cube can rename or drop columns to make the inputs match.';

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

/** Why the Pivot editor won't take a column (PLAN §11.12), shown after the column's type */
export const PIVOT_COLUMN_DISABLED_REASON = {
  /** a row column that can't be compared */
  NOT_GROUPABLE: "can't be grouped",
  /** a pivot column of another type than a String, an integer, a StrictDate or a Boolean */
  NOT_PIVOTABLE: "can't be pivoted",
  /** a column the pivot uses for another part */
  PIVOT_COLUMN: 'the pivot column',
  ROW_COLUMN: 'a row column',
  AGGREGATED: 'the aggregated column',
} as const;

/** Why the Pivot editor won't tick a value (PLAN §11.12) */
export const PIVOT_VALUE_DISABLED_REASON = {
  NOT_A_COLUMN_NAME: "can't name a column",
  /** another value ticked has the same text in another case */
  DIFFERS_ONLY_IN_CASE: 'only its case differs from a ticked value',
  /** as many values are ticked as a Pivot takes */
  TOO_MANY: 'as many values as a Pivot takes are ticked',
} as const;

/** What the Pivot editor says (PLAN §11.12) */
export const PIVOT_EDITOR_NOTES = [
  'Each picked value becomes a column, named by the value, holding the aggregation of its rows; each combination of the row columns with a picked value becomes a row. Values not picked, and combinations holding only them, are left out.',
  "Load values lists the pivot column's values, each once, up to 100. An empty value can't be pivoted, nor one that can't name a column; of two values that differ only in case, one can be ticked, as some databases would mix up their columns.",
  "Pivot runs on Snowflake, Databricks, SingleStore and DuckDB; other databases, such as H2 and Postgres, can't run it.",
] as const;

/** Says that Load values found no value to list (PLAN §11.12) */
export const PIVOT_NO_VALUES_NOTICE =
  'The pivot column has no value to list: its rows are all empty, or there are none.';

/** Says that the engine has more values than the Pivot editor lists (PLAN §11.12) */
export const getPivotValuesCutNotice = (shown: number): string =>
  `Only the first ${shown} values are listed.`;

/** Why the Partition editor won't tick a column that can't be compared (PLAN §11.6) */
export const CUBE_PARTITION_COLUMN_DISABLED_REASON = "can't be partitioned by";

/** What a Partition row shows in the column's place for a function that takes none (PLAN §11.6) */
export const getPartitionNoColumnText = (fn: string): string =>
  fn === 'CountRows' ? 'Every row' : 'By the sort columns';

/** What the Partition editor says about its window functions (PLAN §11.6: D5's frames, Q2, Q3; §11.9) */
export const PARTITION_EDITOR_NOTES = [
  'With sort columns, the aggregations (Count to Max, and Count Rows) run from the first row of the partition to the current row, and rows that tie on the sort columns count together: a Distinct Value is then the one value so far. Without sort columns, they cover the whole partition.',
  "Rank, Dense Rank and Row Number need a sort column. Tied rows share a rank: Rank then skips numbers and Dense Rank doesn't. Row Number numbers every row, and rows tied on this node's sort columns get their numbers in no set order: add a sort column that tells them apart, such as an id, for a stable top N.",
  'NTile, Percent Rank and Cumulative Distribution need a sort column too. NTile splits each partition into buckets of near-equal size, numbered from 1 in the sort order; Percent Rank and Cumulative Distribution give each row its place in its partition, from 0 to 1.',
  "Lag and Lead read a column from the row so many rows before or after in the sort order, and are empty at the partition's edges. First and Last read it from the partition's first and last rows, the same on every row. They need a sort column, and rows tied on it may give any of them.",
  "On ClickHouse, First and Last skip empty values, and Lag and Lead show a column's default, such as 0, at the partition's edges instead of empty, unless the column is optional there.",
  "Their sort columns also make this node's other functions run. For totals over the whole partition, add another Apply Window Functions without sort columns.",
  'Empty sort values come last when ascending and first when descending on H2; other databases may differ.',
  "A Sort before this node doesn't order the window: its sort columns do. The rows keep the order they came in.",
  'Count counts the values that are not empty; Count Rows counts every row.',
  'Some databases, such as Postgres, SQL Server, Databricks and Trino, refuse Distinct Count and Distinct Value in a window.',
];

/** Why a column of the Left input can't be a difference column (PLAN §11.7) */
export const CUBE_DIFFERENCE_COLUMN_REASONS = Object.freeze({
  JOIN_COLUMN: 'a join column',
  NOT_NUMERIC: 'not a number',
  NOT_IN_RIGHT: 'not in the Right input',
  TYPE_DIFFERS: (rightType: string): string =>
    `${rightType} in the Right input`,
});

/** What the Difference editor says about its output (spec §7.12, PLAN §11.7) */
export const DIFFERENCE_EDITOR_NOTES = [
  "For each difference column x, the output has x_1, the Left input's value, x_2, the Right input's value, and x_valueDifference, x_1 minus x_2.",
  'Rows only one input has are kept, with empty values for the other input, and an empty value counts as 0 in the difference.',
  'A difference column needs the same number type in both inputs; the difference of integers is an Integer, of floats a Float, and of decimals a Number.',
];

/** What the Extend editor says about its expressions (PLAN §11.7) */
export const EXTEND_EDITOR_NOTES = [
  'Write each expression as a lambda of one row, such as x | $x.PRICE * $x.QTY: $x.PRICE reads the column PRICE. A column can use the new columns above it.',
  'An optional column needs ->toOne() before arithmetic, such as $x.QTY->toOne() * 2; an empty value still gives an empty result. Every new column is optional.',
  "Validate (F10) checks the expressions with the engine, types them, and plans them for this cube's database: some functions type, but not every database runs them.",
];

/** Why the Extend editor's Apply waits (PLAN §11.7) */
export const EXTEND_APPLY_DISABLED_REASON = Object.freeze({
  NOT_VALIDATED: 'Validate the expressions first (F10)',
  VALIDATING: 'Validating the expressions',
});

/** The warning on an Extend whose saved types the engine couldn't check again, e.g. offline (PLAN §11.7) */
export const getExtendRetypeWarning = (firstLine: string): string =>
  `Could not check these columns' types again, so they keep their saved ones: ${firstLine}`;

/** The warning on a Filter by Expression whose condition the engine couldn't check again, e.g. offline (PLAN §11.11) */
export const getConditionRecheckWarning = (firstLine: string): string =>
  `Could not check this condition again, so it keeps its last check: ${firstLine}`;

/** The notice of a node editor kept open, since its changes can't be applied yet, e.g. an Extend's expressions not validated */
export const getEditorKeptOpenNotice = (
  nodeId: string,
  waiting: string,
): string =>
  `The editor of ${nodeId} stays open, since its changes can't be applied yet: ${waiting}, or Cancel to drop them.`;

/** Why the Filter by Expression editor's Apply waits (PLAN §11.11) */
export const EXPRESSION_FILTER_APPLY_DISABLED_REASON = Object.freeze({
  NOT_VALIDATED: 'Validate the condition first (F10)',
  VALIDATING: 'Validating the condition',
});

/**
 * The hint after an engine error on `and`, `or` or `not` given something
 * other than a Boolean, which Pure's precedence usually causes: comparisons
 * bind no tighter than `&&`, `||` and `!` (PLAN §11.11)
 */
export const EXPRESSION_FILTER_PARENTHESES_HINT =
  'Put each comparison in parentheses: ($x.A > 1) && ($x.B > 3).';

/** What the Filter by Expression editor says about conditions (PLAN §11.11) */
export const EXPRESSION_FILTER_EDITOR_NOTES = [
  "A condition of one row, written as in Query's text mode: x | $x.SHIPPED_DATE > $x.REQUIRED_DATE. The rows for which it is true are kept, in their order.",
  'Put each comparison in parentheses when you combine them: ($x.A > 1) && ($x.B > 3). In Pure, &&, || and ! bind as tightly as >, <, >= and <=; == binds tighter.',
  'An optional column, compared directly ($x.A > 6), fails the condition when it is empty and passes its negation. After ->toOne(), an empty value fails both.',
  "Validate (F10) checks the condition with the engine and plans it for the cube's database.",
  "startsWith, endsWith and contains can't take a value with a backslash (\\) yet, nor, on DuckDB, one with % or _.",
] as const;

/** The hint after an engine error on a column that can be empty, in arithmetic (PLAN §11.7) */
export const EXTEND_TO_ONE_HINT =
  'An optional column needs ->toOne() first, such as $x.QTY->toOne() + 1.';

/** The problem a database refusing an Extend's or a Filter by Expression's plan gives (PLAN §11.7, §11.11) */
export const getExtendPlanProblem = (
  databaseType: string | undefined,
  detail: string,
): string =>
  `${databaseType ? `${databaseType} can't run it` : "The database can't run it"}: ${detail}`;

/** Under the Rename editor's rows: the rule for new column names (PLAN §11.4) */
export const COLUMN_NAME_RULES_HINT =
  'Names can\'t start or end with a space, or contain " or \\ or control characters, and have at most 128 characters.';

/** Words a title leaves in lower case, but first */
const TITLE_SMALL_WORDS = new Set(['a', 'an', 'of']);

/**
 * A node type's label as the node editor's title shows it, each word
 * capitalised but `a`, `an` and `of` (QUESTIONS.md U1(a)), e.g. 'Take a Range
 * of Rows'; the registry keeps its own wording
 */
export const toEditorTitle = (label: string): string =>
  label.replace(/(?<=^|\s)[a-z]+/gu, (word, offset: number) =>
    offset > 0 && TITLE_SMALL_WORDS.has(word)
      ? word
      : `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`,
  );

/** The source dialog's body until a tab is chosen, opened from the empty canvas (spec §17.8, U4(b)) */
export const SELECT_SOURCE_TYPE_PROMPT = 'Select source type above';

/** Why the source dialog's Add is disabled: nothing picked yet, or not ready */
export const CUBE_PICK_TO_ADD_TITLE = 'Pick what to add first';

/**
 * The badge a node type shows beside its name: WIP for one that doesn't
 * work yet (a service, PLAN §6.4), else BETA for one in beta, else none
 */
export const getCubeNodeBadge = (definition: {
  readonly beta: boolean;
  readonly wip?: boolean | undefined;
}): 'WIP' | 'BETA' | undefined =>
  definition.wip ? 'WIP' : definition.beta ? 'BETA' : undefined;
