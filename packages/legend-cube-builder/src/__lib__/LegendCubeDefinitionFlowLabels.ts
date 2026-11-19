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

// What a definition flow (`@finos/legend-cube-builder/definition-flow`)
// says: a data product's access point definition, drawn read-only

export const CUBE_DEFINITION_FLOW_MESSAGE = {
  /** A source other than an ingest data set: `what` names it, e.g. "a table, #>{…}#" */
  SOURCE: (what: string): string =>
    `Cube draws a definition that reads ingest data sets, #I{…}#, and this one reads ${what}.`,
  TABLE: 'a table, #>{…}#',
  ACCESS_POINT: "a data product's access point, #P{…}#",
  FUNCTION: (name: string): string => `the function ${name}()`,
  OTHER: 'another source',
  /** Why a function isn't opened: SQL in its body reads one of its values by name */
  SQL_READS_VALUE: (name: string): string =>
    `its SQL reads $${name}, a value of the function, by name.`,
};

/** `$a`, `$a and $b`, `$a, $b and $c` */
const listParameters = (names: readonly string[]): string => {
  const variables = names.map((name) => `$${name}`);
  return variables.length <= 1
    ? (variables[0] ?? '')
    : `${variables.slice(0, -1).join(', ')} and ${variables.at(-1)}`;
};

export const CUBE_DEFINITION_FLOW_LABEL = {
  /** In the tooltip of a data set whose columns the host didn't give */
  UNKNOWN_COLUMNS: "Its columns aren't known.",
  /** What the output step's label says on hover: nothing runs in a flow */
  OUTPUT_TITLE: 'The output step: the definition gives its rows',
  /** In the tooltip of a step that reads the definition's parameters */
  READS_PARAMETERS: (names: readonly string[]): string =>
    `Reads ${listParameters(names)}.`,
  /** In a parameter's tooltip, before the steps that read it, one a line */
  PARAMETER_READ_BY: 'Read by:',
  /** In the tooltip of a parameter no step reads */
  PARAMETER_UNREAD: 'No step reads it.',
  /** After a parameter's type in words, when it may be left out */
  PARAMETER_OPTIONAL: 'optional',
  /** After a parameter's type in words, when it takes any number of values */
  PARAMETER_LIST: 'a list',
  /** Under a call drawn as one box: what is known of its columns */
  CALL_COLUMNS_DECLARED: (count: number): string =>
    `${count} columns, as declared`,
  CALL_COLUMNS_NOT_DECLARED: 'columns not declared',
  CALL_NOT_FOUND: 'not found',
  /** In the tooltip of a call drawn as one box: why it isn't opened */
  CALL_CLOSED_NOT_FOUND:
    "Cube didn't find this function in the project or its dependencies, so its steps can't be shown.",
  CALL_CLOSED_AMBIGUOUS:
    "Two functions of this name take as many values, and Cube doesn't tell them apart yet.",
  CALL_CLOSED_STATEMENTS:
    'Its body has statements other than lets, so Cube shows it as one step.',
  CALL_CLOSED_NOT_DRAWABLE: (message: string | undefined): string =>
    `Cube can't draw its body yet${message ? `: ${message}` : '.'}`,
  CALL_CLOSED_SHARED_INPUT:
    "Its body reads the rows it takes more than once, which Cube's flow can't draw.",
  CALL_CLOSED_CAPTURE:
    "A value it is given reads a name its body uses for something else, so Cube can't put it in.",
  CALL_CLOSED_RECURSION: 'It calls itself, so it is shown once.',
  CALL_CLOSED_DEPTH: 'It is called too deep inside other functions to open.',
  /** In a call's tooltip: the project it comes from */
  CALL_FROM: (origin: string): string => `From ${origin}`,
  /** In a step's tooltip: a user-defined function its expression calls */
  CALLS_FUNCTION: (name: string, signature: string, origin?: string): string =>
    `Calls ${name}: ${signature}${origin ? `, from ${origin}` : ''}`,
  /** A call's buttons */
  FOLD_CALL: 'Fold the function to one box',
  OPEN_CALL: 'Open the function',
  SHOW_FUNCTION: (name: string): string => `Show the Pure of ${name}`,
  /** On a step that is SQL, `#SQL{…}#`, drawn as one box */
  SQL: 'SQL',
  /** Under its first line: what its SQL names, or that nothing is known of it */
  SQL_NAMES: (names: readonly string[]): string =>
    `names ${names.length <= 2 ? names.join(' and ') : `${names[0]} and ${names.length - 1} more`}`,
  SQL_COLUMNS_UNKNOWN: 'columns not known',
  /** In its tooltip */
  SQL_ONE_STEP:
    "Cube shows SQL as one step and doesn't read it, so its columns aren't known.",
  SQL_NAMES_DATA_SETS: (names: readonly string[]): string =>
    `Ingest data sets it names: ${names.join(', ')}`,
  SQL_NAMES_ACCESS_POINTS: (names: readonly string[]): string =>
    `Access points it names: ${names.join(', ')}`,
  SHOW_SQL: 'Click to show its SQL.',
  /** A host's note above a flow whose SQL has steps after it */
  SQL_UNCHECKED: (count: number): string =>
    count === 1
      ? "The SQL is shown as one step, with no columns known, so the steps after it aren't checked."
      : "Each SQL is shown as one step, with no columns known, so the steps after them aren't checked.",
  /** How many steps a call holds */
  STEP_COUNT: (count: number): string =>
    `${count} ${count === 1 ? 'step' : 'steps'}`,
  FOLDED: (steps: string): string => `${steps}, folded`,
};
