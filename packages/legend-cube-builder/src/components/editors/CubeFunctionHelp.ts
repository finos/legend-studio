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

import type {
  CubeFunctionSignature,
  CubeFunctionTestResults,
} from '../../graph-manager/CubeFunctionCatalogue.js';

// A function's help, as its completions, hover, signature help and the
// functions panel show it (EXPRESSION-EDITOR.md, rounds 1 and 2): each
// signature as Pure writes it, its documentation, and how the engine's tests
// of its definition went on the cube's database. A test that fails doesn't
// mean the function can't run there (`year` fails its one test everywhere,
// and runs), so the line informs, and nothing is hidden or sorted by it.

/** How the help says a database, by the engine's name for it */
const DATABASE_LABELS: Readonly<Record<string, string>> = {
  MemSQL: 'SingleStore',
  SqlServer: 'SQL Server',
};

/** A database as the help names it: SingleStore for the engine's `MemSQL` */
export const getCubeDatabaseLabel = (database: string): string =>
  DATABASE_LABELS[database] ?? database;

/** The failing tests the line lists at most */
const MAX_FAILURES_LISTED = 3;

/** What the help knows of the database the expression runs on */
export interface CubeFunctionHelpContext {
  /** As the engine names it, e.g. `DuckDB`; none until the model's runtime tells it */
  readonly databaseType?: string | undefined;
  /** The databases the engine's catalogue reports tests on */
  readonly testedDatabases?: ReadonlySet<string> | undefined;
}

/**
 * How the engine's tests of a definition went on the database, in Markdown:
 * how many pass, the failing ones listed; that the engine has no tests of
 * it there, or none on that database at all, as a local engine has none on
 * Snowflake; nothing when the database isn't known
 */
export const getCubeFunctionTestLine = (
  testResults: CubeFunctionTestResults | undefined,
  context: CubeFunctionHelpContext,
): string | undefined => {
  const { databaseType, testedDatabases } = context;
  if (databaseType === undefined) {
    return undefined;
  }
  const database = getCubeDatabaseLabel(databaseType);
  const result = testResults?.get(databaseType);
  if (!result) {
    return testedDatabases?.has(databaseType)
      ? `**On ${database}:** the engine has no tests of it.`
      : `**On ${database}:** this engine's catalogue has no tests on ${database}.`;
  }
  const line = `**On ${database}:** the engine's tests of it pass ${result.passed} of ${result.total}.`;
  if (!result.failures.length) {
    return line;
  }
  const listed = result.failures
    .slice(0, MAX_FAILURES_LISTED)
    .map(
      ({ test, message }) =>
        `- \`${test}\`${message ? `: ${message.replace(/[`*_]/gu, '')}` : ''}`,
    );
  const more = result.failures.length - listed.length;
  return [
    `${line} A test that fails doesn't mean it can't run there.`,
    [...listed, ...(more > 0 ? [`- and ${more} more`] : [])].join('\n'),
  ].join('\n\n');
};

/**
 * Signatures' help in Markdown: each as Pure writes it, then what it does;
 * after the last signature of each definition, how its tests went on the
 * database
 */
export const getCubeFunctionDocumentation = (
  signatures: readonly CubeFunctionSignature[],
  context: CubeFunctionHelpContext = {},
): string =>
  signatures
    .map((signature, index) => {
      // a definition's signatures share its test results
      const isLastOfDefinition =
        signatures[index + 1]?.testResults !== signature.testResults ||
        index === signatures.length - 1;
      return [
        `\`\`\`pure\n${signature.text}\n\`\`\``,
        signature.documentation.trim(),
        (isLastOfDefinition
          ? getCubeFunctionTestLine(signature.testResults, context)
          : undefined) ?? '',
      ]
        .filter((part) => part.length)
        .join('\n\n');
    })
    .join('\n\n---\n\n');

/**
 * How the engine's tests of each of a function's definitions went on the
 * database, in Markdown, as the functions panel says it first: one line a
 * definition the engine reports tests of, named by its first signature's
 * types when there are several
 */
export const getCubeFunctionTestSummary = (
  signatures: readonly CubeFunctionSignature[],
  context: CubeFunctionHelpContext,
): string => {
  // a definition the engine reports no tests of at all, as Cube's own, says nothing
  const definitions = signatures.filter(
    (signature, index) =>
      signature.testResults !== undefined &&
      signatures.findIndex(
        (other) => other.testResults === signature.testResults,
      ) === index,
  );
  return definitions
    .flatMap((signature) => {
      const line = getCubeFunctionTestLine(signature.testResults, context);
      if (line === undefined) {
        return [];
      }
      const name = `\`${signature.name}(${signature.parameters
        .map(({ type, multiplicity }) => `${type}[${multiplicity}]`)
        .join(', ')})\``;
      return [definitions.length > 1 ? `${name}: ${line}` : line];
    })
    .join('\n\n');
};

/** One signature's documentation, then how its definition's tests went on the database */
export const getCubeSignatureDocumentation = (
  signature: CubeFunctionSignature,
  context: CubeFunctionHelpContext = {},
): string =>
  [
    signature.documentation.trim(),
    getCubeFunctionTestLine(signature.testResults, context) ?? '',
  ]
    .filter((part) => part.length)
    .join('\n\n');

/** Text a snippet writes as is: its `$`, `}` and `\` escaped */
const snippetText = (text: string): string => text.replace(/[$}\\]/gu, '\\$&');

/** The signature with the fewest parameters: the call written first */
export const getCubeShortestSignature = (
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
 * A call of the signature as a snippet, a placeholder for each argument,
 * named as its documentation names it, or as another signature names a
 * parameter of its type there, a text one quoted: after a value, `->`, its
 * first parameter the value, `lpad(${1:length}, '${2:char}')`; else every
 * parameter's, `lpad(${1:str}, ${2:length}, '${3:char}')`
 */
export const getCubeFunctionCallSnippet = (
  signature: CubeFunctionSignature,
  others: readonly CubeFunctionSignature[],
  isArrow = true,
  /** Its placeholders written as plain text, as code written without the editor needs */
  asText = false,
): string => {
  const skipped = isArrow ? 1 : 0;
  return `${signature.name}(${signature.parameters
    .slice(skipped)
    .map((parameter, index) => {
      const name =
        parameter.name ??
        others
          .map((other) => other.parameters[index + skipped])
          .find((other) => other?.name && other.type === parameter.type)?.name;
      const placeholder = asText
        ? (name ?? parameter.type)
        : `\${${index + 1}:${snippetText(name ?? parameter.type)}}`;
      // a text written as one, but the value a call written whole is of
      const isText = parameter.type === 'String' && (isArrow || index > 0);
      return isText ? `'${placeholder}'` : placeholder;
    })
    .join(', ')})`;
};

/**
 * Whether a call written at the cursor follows a value, from the character
 * before it: after a name, a number, `)`, `]` or a string's quote it is
 * written `->name(…)`, the value its first argument; else `name(…)`
 */
export const followsCubeValue = (characterBefore: string): boolean =>
  /[\w)\]']/u.test(characterBefore);

/**
 * A call of a function, by its signatures, written after the character
 * before the cursor: `->name(…)` after a value; else `name(…)`, a space
 * before it but at the start, after a space, a bracket or a separator; its
 * shortest signature's arguments as placeholders, or as plain text
 */
export const getCubeFunctionCallText = (
  signatures: readonly CubeFunctionSignature[],
  characterBefore: string,
  asText = false,
): string => {
  const shortest = getCubeShortestSignature(signatures);
  if (!shortest) {
    return '';
  }
  const isArrow = followsCubeValue(characterBefore);
  const call = getCubeFunctionCallSnippet(
    shortest,
    signatures,
    isArrow,
    asText,
  );
  return isArrow
    ? `->${call}`
    : `${characterBefore && !/[\s([{,!]/u.test(characterBefore) ? ' ' : ''}${call}`;
};
