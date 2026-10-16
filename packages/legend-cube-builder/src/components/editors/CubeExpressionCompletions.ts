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

import { type CubeType, TypeFamily } from '@finos/legend-cube';
import {
  type CodeEditorCompletion,
  type CodeEditorCompletionSource,
  CodeEditorCompletionKind,
} from '@finos/legend-lego/code-editor';
import { getColumnTypeLabel } from '../../__lib__/LegendCubeLabels.js';
import type { CubeCodeCompletion } from '../../graph-manager/CubeEngine.js';
import { pureStringLiteral } from '../../stores/CubePureText.js';

// The completions of a Pure expression of one row, `x | …` (user,
// 2026-10-16): Cube's own, from what it knows without the engine (after
// `$x.` the columns the expression can read, with their types, after `$`
// the same as `x.COLUMN`, and after `$x.COLUMN->` the functions of its
// type), then the engine's, where it completes code.

/** A column an expression can read: the input's, or a new column above it */
export interface CubeCompletionColumn {
  readonly name: string;
  readonly type?: CubeType | undefined;
  readonly nullable?: boolean | undefined;
}

/** The characters that open the completions as they are typed */
const TRIGGERS: readonly string[] = ['.', '>', '$'];

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const IDENTIFIER_SOURCE = '[A-Za-z_][A-Za-z0-9_]*';
const QUOTED_SOURCE = "'(?:[^'\\\\]|\\\\.)*'";

/** The lambda's parameter, `x` in `x | …`; `x` until one is written */
const parameterOf = (text: string): string =>
  /^\s*(?<parameter>[A-Za-z_][A-Za-z0-9_]*)\s*\|/u.exec(text)?.groups
    ?.parameter ?? 'x';

/** A column's name as an expression writes it after `$x.`: quoted unless an identifier */
const accessorOf = (name: string): string =>
  IDENTIFIER.test(name) ? name : pureStringLiteral(name);

/** A column's name, from how an expression wrote it */
const nameOf = (written: string): string =>
  written.startsWith("'")
    ? written.slice(1, -1).replace(/\\(?<escaped>.)/gu, '$<escaped>')
    : written;

interface CubeFunctionCompletion {
  readonly name: string;
  readonly snippet: string;
  readonly detail: string;
}

const fn = (
  name: string,
  snippet: string,
  detail: string,
): CubeFunctionCompletion => ({ name, snippet, detail });

const TEXT_FUNCTIONS = [
  fn('contains', "contains('${1}')", 'contains(text): Boolean'),
  fn('startsWith', "startsWith('${1}')", 'startsWith(text): Boolean'),
  fn('endsWith', "endsWith('${1}')", 'endsWith(text): Boolean'),
  fn('toUpper', 'toUpper()', 'toUpper(): Text'),
  fn('toLower', 'toLower()', 'toLower(): Text'),
  fn('trim', 'trim()', 'trim(): Text'),
  fn('length', 'length()', 'length(): Whole number'),
  fn('substring', 'substring(${1:0}, ${2:1})', 'substring(start, end): Text'),
  fn('indexOf', "indexOf('${1}')", 'indexOf(text): Whole number'),
];

const NUMBER_FUNCTIONS = [
  fn('abs', 'abs()', 'abs(): Number'),
  fn('round', 'round()', 'round(): Whole number'),
  fn('floor', 'floor()', 'floor(): Whole number'),
  fn('ceiling', 'ceiling()', 'ceiling(): Whole number'),
  fn('toString', 'toString()', 'toString(): Text'),
];

const DATE_FUNCTIONS = [
  fn('year', 'year()', 'year(): Whole number'),
  fn('monthNumber', 'monthNumber()', 'monthNumber(): Whole number'),
  fn('dayOfMonth', 'dayOfMonth()', 'dayOfMonth(): Whole number'),
  fn('toString', 'toString()', 'toString(): Text'),
];

const TIME_FUNCTIONS = [
  fn('hour', 'hour()', 'hour(): Whole number'),
  fn('minute', 'minute()', 'minute(): Whole number'),
];

const VARIANT_FUNCTIONS = [
  fn('get', "get('${1}')", "get(key): a field's JSON value"),
  fn('to', 'to(@${1:String})', 'to(@Type): the value as the type'),
];

/** What every value takes: whether it is empty, one value for arithmetic, one of a list */
const VALUE_FUNCTIONS = [
  fn('isEmpty', 'isEmpty()', 'isEmpty(): Boolean'),
  fn('isNotEmpty', 'isNotEmpty()', 'isNotEmpty(): Boolean'),
  fn('in', 'in([${1}])', 'in([values]): Boolean'),
];

const TO_ONE = fn('toOne', 'toOne()', 'toOne(): the one value, for arithmetic');

/** The functions of a column's type, `toOne()` first for an optional one */
const functionsOf = (
  column: CubeCompletionColumn | undefined,
): CubeFunctionCompletion[] => {
  const family = column?.type?.family;
  const own =
    family === TypeFamily.STRING
      ? TEXT_FUNCTIONS
      : family === TypeFamily.INTEGER ||
          family === TypeFamily.FLOAT ||
          family === TypeFamily.DECIMAL ||
          family === TypeFamily.NUMBER
        ? NUMBER_FUNCTIONS
        : family === TypeFamily.DATETIME
          ? [...DATE_FUNCTIONS, ...TIME_FUNCTIONS]
          : family === TypeFamily.STRICT_DATE || family === TypeFamily.DATE
            ? DATE_FUNCTIONS
            : family === TypeFamily.VARIANT
              ? VARIANT_FUNCTIONS
              : [];
  return [
    ...(column?.nullable ? [TO_ONE] : []),
    ...own,
    ...(family === TypeFamily.VARIANT ? [] : VALUE_FUNCTIONS),
    ...(column?.nullable ? [] : [TO_ONE]),
  ];
};

const columnCompletion = (
  column: CubeCompletionColumn,
  insertText: string,
  replaceLength: number,
): CodeEditorCompletion => ({
  label: column.name,
  insertText,
  detail:
    column.type !== undefined
      ? getColumnTypeLabel({
          name: column.name,
          type: column.type,
          nullable: column.nullable ?? false,
        })
      : undefined,
  kind: CodeEditorCompletionKind.FIELD,
  replaceLength,
});

/**
 * The completions at the end of the text before the cursor of a Pure
 * expression of one row: the columns after `$x.` or `$`, the functions of
 * a column's type after `$x.COLUMN->`; none elsewhere
 */
export const getCubeExpressionCompletions = (
  textBeforeCursor: string,
  columns: readonly CubeCompletionColumn[],
): CodeEditorCompletion[] => {
  const parameter = parameterOf(textBeforeCursor);
  // `$x.COLUMN->tex`: the column's functions
  const call = new RegExp(
    `\\$${parameter}\\.(?<column>${IDENTIFIER_SOURCE}|${QUOTED_SOURCE})->(?<partial>[A-Za-z]*)$`,
    'u',
  ).exec(textBeforeCursor);
  if (call?.groups) {
    const name = nameOf(call.groups.column ?? '');
    const column = columns.find((each) => each.name === name);
    const replaceLength = call.groups.partial?.length ?? 0;
    return functionsOf(column).map((each) => ({
      label: each.name,
      insertText: each.snippet,
      isSnippet: true,
      detail: each.detail,
      kind: CodeEditorCompletionKind.FUNCTION,
      replaceLength,
    }));
  }
  // `$x.COL`: the columns
  const field = new RegExp(
    `\\$${parameter}\\.(?<partial>[A-Za-z0-9_]*)$`,
    'u',
  ).exec(textBeforeCursor);
  if (field?.groups) {
    const replaceLength = field.groups.partial?.length ?? 0;
    return columns.map((column) =>
      columnCompletion(column, accessorOf(column.name), replaceLength),
    );
  }
  // `$x` being written: the columns, as `x.COLUMN`
  const variable = /\$(?<partial>[A-Za-z_][A-Za-z0-9_]*)?$/u.exec(
    textBeforeCursor,
  );
  if (variable) {
    const partial = variable.groups?.partial ?? '';
    if (!parameter.startsWith(partial)) {
      return [];
    }
    return columns.map((column) => ({
      ...columnCompletion(
        column,
        `${parameter}.${accessorOf(column.name)}`,
        partial.length,
      ),
      label: `${parameter}.${column.name}`,
    }));
  }
  return [];
};

/** The engine's completions of the code typed so far: undefined when it completes no code */
export type CubeEngineCompletionSource = (
  textBeforeCursor: string,
) => Promise<readonly CubeCodeCompletion[] | undefined>;

/** How long the completions wait for the engine's, before showing Cube's own alone */
export const CUBE_ENGINE_COMPLETIONS_WAIT_MS = 1000;

/** A completion's name, to tell the engine's that Cube already offers: `contains` of `contains(…)` */
const keyOf = (label: string): string =>
  label.replace(/\(.*$/su, '').replace(/^'|'$/gu, '').trim();

/** The engine's completions after Cube's own, but those Cube offers already */
export const mergeCubeEngineCompletions = (
  own: readonly CodeEditorCompletion[],
  engine: readonly CubeCodeCompletion[],
  textBeforeCursor: string,
): CodeEditorCompletion[] => {
  const offered = new Set(own.map((each) => keyOf(each.label)));
  // the engine completes the word being typed
  const replaceLength = /[A-Za-z0-9_]*$/u.exec(textBeforeCursor)?.[0].length;
  return [
    ...own,
    ...engine
      .filter(({ display }) => !offered.has(keyOf(display)))
      .map(({ completion, display }) => ({
        label: display,
        insertText: completion,
        kind: CodeEditorCompletionKind.TEXT,
        replaceLength,
      })),
  ];
};

/** The engine's completions, or none once they take too long or fail */
const engineCompletionsWithin = async (
  engine: CubeEngineCompletionSource,
  textBeforeCursor: string,
): Promise<readonly CubeCodeCompletion[]> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return (
      (await Promise.race([
        engine(textBeforeCursor),
        new Promise<undefined>((resolve) => {
          timer = setTimeout(
            () => resolve(undefined),
            CUBE_ENGINE_COMPLETIONS_WAIT_MS,
          );
        }),
      ])) ?? []
    );
  } catch {
    // half-typed code the engine can't complete: Cube's own only
    return [];
  } finally {
    clearTimeout(timer);
  }
};

/**
 * A code editor's completions of a Pure expression reading these columns:
 * Cube's own, then the engine's, when given
 */
export const getCubeExpressionCompletionSource = (
  columns: readonly CubeCompletionColumn[],
  engine?: CubeEngineCompletionSource | undefined,
): CodeEditorCompletionSource => ({
  triggerCharacters: TRIGGERS,
  getCompletions: async (textBeforeCursor) => {
    const own = getCubeExpressionCompletions(textBeforeCursor, columns);
    return engine
      ? mergeCubeEngineCompletions(
          own,
          await engineCompletionsWithin(engine, textBeforeCursor),
          textBeforeCursor,
        )
      : own;
  },
});
