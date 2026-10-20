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
  type CodeEditorHoverSource,
  type CodeEditorSignature,
  type CodeEditorSignatureHelpSource,
  CodeEditorCompletionKind,
} from '@finos/legend-lego/code-editor';
import { getColumnTypeLabel } from '../../__lib__/LegendCubeLabels.js';
import type { CubeCodeCompletion } from '../../graph-manager/CubeEngine.js';
import type {
  CubeFunctionCatalogue,
  CubeFunctionOffer,
  CubeFunctionSignature,
} from '../../graph-manager/CubeFunctionCatalogue.js';
import { pureStringLiteral } from '../../stores/CubePureText.js';

// The completions of a Pure expression of one row, `x | …` (user,
// 2026-10-16): Cube's own, from what it knows without the engine (after
// `$x.` the columns the expression can read, with their types, after `$`
// the same as `x.COLUMN`, and after `$x.COLUMN->` the functions of its
// type), then the engine's, where it completes code. With the engine's
// function catalogue (EXPRESSION-EDITOR.md, round 1), a column's functions
// are every one its type is passed to, each with its signature and
// documentation, which a hover over a function's name and the help while
// its arguments are written show too.

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

/** Functions offered first for an optional column: its one value, or another when it is empty */
const OPTIONAL_FIRST = ['toOne', 'coalesce'];

/** A signature's documentation in Markdown: how Pure writes it, then what it does */
const documentationOf = (
  signatures: readonly CubeFunctionSignature[],
): string =>
  signatures
    .map((signature) =>
      [`\`\`\`pure\n${signature.text}\n\`\`\``, signature.documentation.trim()]
        .filter((part) => part.length)
        .join('\n\n'),
    )
    .join('\n\n---\n\n');

/** Text a snippet writes as is: its `$`, `}` and `\\` escaped */
const snippetText = (text: string): string => text.replace(/[$}\\]/gu, '\\$&');

/** The signature with the fewest parameters: the call written first */
const shortestOf = (
  signatures: readonly CubeFunctionSignature[],
): CubeFunctionSignature | undefined =>
  signatures.reduce<CubeFunctionSignature | undefined>(
    (shortest, each) =>
      !shortest || each.parameters.length < shortest.parameters.length
        ? each
        : shortest,
    undefined,
  );

/**
 * A call of the signature after `->`, its first parameter the value: a
 * placeholder for each other, named as its documentation names it, a text
 * one quoted, e.g. `lpad(${1:length}, '${2:char}')`
 */
const snippetOf = (signature: CubeFunctionSignature): string =>
  `${signature.name}(${signature.parameters
    .slice(1)
    .map((parameter, index) => {
      const placeholder = `\${${index + 1}:${snippetText(
        parameter.name ?? parameter.type,
      )}}`;
      return parameter.type === 'String' ? `'${placeholder}'` : placeholder;
    })
    .join(', ')})`;

/** A function's completion, from the catalogue's offer, Cube's own snippet first */
const offerCompletion = (
  offer: CubeFunctionOffer,
  own: CubeFunctionCompletion | undefined,
): CubeFunctionCompletion & { documentation: string } => {
  const shortest = shortestOf(offer.signatures);
  const others = offer.signatures.length - 1;
  return {
    name: offer.function.name,
    snippet: own?.snippet ?? (shortest ? snippetOf(shortest) : ''),
    detail: shortest
      ? `${shortest.text}${others ? ` (+${others} more)` : ''}`
      : (own?.detail ?? ''),
    documentation: documentationOf(offer.signatures),
  };
};

/**
 * The functions of a column's type: without a catalogue, Cube's own
 * (`functionsOf`); with one, every function its type is passed to, Cube's
 * own first, then the others by name, `toOne()` and `coalesce()` first for
 * an optional one; Cube's own the catalogue doesn't have (`substring`,
 * `indexOf`) kept
 */
const functionCompletionsOf = (
  column: CubeCompletionColumn | undefined,
  catalogue: CubeFunctionCatalogue | undefined,
): (CubeFunctionCompletion & { documentation?: string | undefined })[] => {
  const own = functionsOf(column);
  if (!catalogue) {
    return own;
  }
  const offers = new Map(
    catalogue
      .offersFor(column?.type?.family)
      .map((offer) => [offer.function.name, offer]),
  );
  const ownByName = new Map(own.map((each) => [each.name, each]));
  const names = new Set([
    ...(column?.nullable
      ? OPTIONAL_FIRST.filter((name) => offers.has(name) || ownByName.has(name))
      : []),
    ...own.map((each) => each.name),
    ...[...offers.keys()].sort((a, b) => a.localeCompare(b)),
  ]);
  return [...names].flatMap((name) => {
    const offer = offers.get(name);
    const ownOne = ownByName.get(name);
    return offer ? [offerCompletion(offer, ownOne)] : ownOne ? [ownOne] : [];
  });
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
  catalogue?: CubeFunctionCatalogue | undefined,
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
    return functionCompletionsOf(column, catalogue).map((each) => ({
      label: each.name,
      insertText: each.snippet,
      isSnippet: true,
      detail: each.detail,
      documentation: each.documentation,
      // the catalogue's help, as its arguments are written
      opensSignatureHelp:
        catalogue !== undefined && !each.snippet.endsWith('()'),
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
 * Cube's own, from the function catalogue when given, then the engine's,
 * when given
 */
export const getCubeExpressionCompletionSource = (
  columns: readonly CubeCompletionColumn[],
  engine?: CubeEngineCompletionSource | undefined,
  catalogue?: CubeFunctionCatalogue | undefined,
): CodeEditorCompletionSource => ({
  triggerCharacters: TRIGGERS,
  getCompletions: async (textBeforeCursor) => {
    const own = getCubeExpressionCompletions(
      textBeforeCursor,
      columns,
      catalogue,
    );
    return engine
      ? mergeCubeEngineCompletions(
          own,
          await engineCompletionsWithin(engine, textBeforeCursor),
          textBeforeCursor,
        )
      : own;
  },
});

// ---------- a function's help: its hover, and its signatures while its arguments are written ----------

/**
 * The code with its strings blanked, quote to quote, so that their text is
 * not read as code; and whether it ends inside one
 */
const blankStrings = (text: string): { code: string; inString: boolean } => {
  let code = '';
  let inString = false;
  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);
    if (inString) {
      if (char === '\\') {
        code += '  ';
        index += 1;
        continue;
      }
      if (char === "'") {
        inString = false;
        code += char;
        continue;
      }
      code += ' ';
      continue;
    }
    if (char === "'") {
      inString = true;
    }
    code += char;
  }
  return { code, inString };
};

/** A function's signatures for its help: all but the platform's own */
const helpSignaturesOf = (
  catalogue: CubeFunctionCatalogue,
  name: string,
): CubeFunctionSignature[] =>
  catalogue.get(name)?.signatures.filter((each) => !each.isPlatformOnly) ?? [];

/**
 * The hover over a function's name, as a call writes it, after `->` or
 * before `(`: its signatures and documentation; none without a catalogue
 */
export const getCubeFunctionHoverSource = (
  catalogue: CubeFunctionCatalogue | undefined,
): CodeEditorHoverSource | undefined =>
  catalogue
    ? {
        getHover: (word, textBefore, textAfter) => {
          if (blankStrings(textBefore).inString) {
            return undefined;
          }
          const isCalled =
            /->\s*$/u.test(textBefore) || /^\s*\(/u.test(textAfter);
          const signatures = isCalled ? helpSignaturesOf(catalogue, word) : [];
          return signatures.length ? documentationOf(signatures) : undefined;
        },
      }
    : undefined;

/** The characters that open, or move, the help of a call's arguments */
const SIGNATURE_TRIGGERS: readonly string[] = ['(', ','];

const CLOSERS: Readonly<Record<string, string>> = {
  ')': '(',
  ']': '[',
  '}': '{',
};

/**
 * The call whose arguments the cursor is in, from the code before it: the
 * function's name, whether it is called with `->` (its first argument the
 * value before it), and how many of its arguments are written before the
 * cursor's
 */
export const readCubeCallAtCursor = (
  textBeforeCursor: string,
): { name: string; isArrow: boolean; argument: number } | undefined => {
  // a string being written is an argument too: its text is blanked
  const { code } = blankStrings(textBeforeCursor);
  // the brackets not closed, each with the commas written in it since
  const opened: { char: string; index: number; commas: number }[] = [];
  for (let index = 0; index < code.length; index++) {
    const char = code.charAt(index);
    if (char === '(' || char === '[' || char === '{') {
      opened.push({ char, index, commas: 0 });
    } else if (CLOSERS[char]) {
      if (opened.at(-1)?.char === CLOSERS[char]) {
        opened.pop();
      }
    } else if (char === ',') {
      const innermost = opened.at(-1);
      if (innermost) {
        innermost.commas += 1;
      }
    }
  }
  const call = opened.at(-1);
  // in a list or a lambda, not a call's arguments
  if (call?.char !== '(') {
    return undefined;
  }
  const head = /(?<arrow>->\s*)?(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*$/u.exec(
    code.slice(0, call.index),
  )?.groups;
  if (!head?.name) {
    return undefined;
  }
  const isArrow = head.arrow !== undefined;
  return {
    name: head.name,
    isArrow,
    argument: call.commas + (isArrow ? 1 : 0),
  };
};

/** A signature as the help shows it: each parameter where its label writes it */
const helpSignatureOf = (
  signature: CubeFunctionSignature,
): CodeEditorSignature => {
  const label = signature.text;
  let from = signature.name.length + 1;
  return {
    label,
    documentation: signature.documentation.trim() || undefined,
    parameters: signature.parameters.map((parameter) => {
      const start = label.indexOf(parameter.text, from);
      const end = start + parameter.text.length;
      from = end;
      return {
        label: [start, end] as const,
        documentation: parameter.description,
      };
    }),
  };
};

/**
 * The help while a call's arguments are written: the function's
 * signatures, the first that takes as many arguments as are written
 * active; none without a catalogue
 */
export const getCubeFunctionSignatureHelpSource = (
  catalogue: CubeFunctionCatalogue | undefined,
): CodeEditorSignatureHelpSource | undefined =>
  catalogue
    ? {
        triggerCharacters: SIGNATURE_TRIGGERS,
        getSignatureHelp: (textBeforeCursor) => {
          const call = readCubeCallAtCursor(textBeforeCursor);
          const signatures = call ? helpSignaturesOf(catalogue, call.name) : [];
          if (!call || !signatures.length) {
            return undefined;
          }
          const active = signatures.findIndex(
            (each) => each.parameters.length > call.argument,
          );
          return {
            signatures: signatures.map(helpSignatureOf),
            activeSignature: Math.max(active, 0),
            activeParameter: call.argument,
          };
        },
      }
    : undefined;
