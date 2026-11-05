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
  CubeFunction,
  CubeFunctionCatalogue,
  CubeFunctionParameter,
  CubeFunctionSignature,
} from './CubeFunctionCatalogue.js';

// Functions Cube offers that the engine's catalogue lacks, since it
// documents only the functions its compatibility tests (PCT) cover:
// `substring` and `indexOf`, documented by Cube, with what its probe found
// of them by database (EXPRESSION-EDITOR.md, §2.3, 2026-10-19).

const STRING = 'meta::pure::functions::string';

/** A parameter: `[type, multiplicity, name, description]` */
type OwnParameter = readonly [string, string, string, string];

const signatureOf = (
  name: string,
  parameters: readonly OwnParameter[],
  returned: readonly [string, string],
  documentation: string,
): CubeFunctionSignature =>
  new CubeFunctionSignature(
    `${STRING}::${name}_${parameters
      .map(([type, multiplicity]) => `${type}_${multiplicity}_`)
      .join('_')}_${returned[0]}_${returned[1]}_`,
    name,
    parameters.map(
      ([type, multiplicity, parameterName, description]) =>
        new CubeFunctionParameter(
          parameterName,
          type,
          multiplicity,
          description,
        ),
    ),
    returned[0],
    returned[1],
    documentation,
    false,
    false,
  );

/** Says the entry is Cube's own */
const OWN_ENTRY =
  "_Cube's own entry: the engine's catalogue doesn't document this function._";

const SOURCE: OwnParameter = ['String', '1', 'source', 'the text.'];

export const CUBE_OWN_FUNCTIONS: readonly CubeFunction[] = [
  new CubeFunction(
    'substring',
    [STRING],
    [
      signatureOf(
        'substring',
        [
          SOURCE,
          ['Integer', '1', 'start', 'where the part starts, counting from 0.'],
          ['Integer', '1', 'end', 'where the part ends, not included.'],
        ],
        ['String', '1'],
        [
          'The part of `source` from `start` up to, but not including, `end`, counting from 0.',
          '**Results differ by database.** On DuckDB, positions count from 1: `substring(0, 2)` gives one character, not two.',
          '**Parameters**\n- `source` — the text.\n- `start` — where the part starts, counting from 0.\n- `end` — where the part ends, not included.',
          '**Returns** the part of the text.',
          OWN_ENTRY,
        ].join('\n\n'),
      ),
    ],
  ),
  new CubeFunction(
    'indexOf',
    [STRING],
    [
      signatureOf(
        'indexOf',
        [SOURCE, ['String', '1', 'toFind', 'the text to look for.']],
        ['Integer', '1'],
        [
          'Where `toFind` first appears in `source`, counting from 0; -1 when it doesn’t appear.',
          '**Results differ by database.** On H2 and DuckDB, positions count from 1, and 0 means it doesn’t appear.',
          '**Parameters**\n- `source` — the text.\n- `toFind` — the text to look for.',
          '**Returns** where it first appears.',
          OWN_ENTRY,
        ].join('\n\n'),
      ),
    ],
  ),
];

/** The catalogue with Cube's own functions it lacks */
export const withCubeOwnFunctions = (
  catalogue: CubeFunctionCatalogue,
): CubeFunctionCatalogue =>
  new CubeFunctionCatalogue([
    ...catalogue.functions.values(),
    ...CUBE_OWN_FUNCTIONS.filter((each) => !catalogue.get(each.name)),
  ]);
