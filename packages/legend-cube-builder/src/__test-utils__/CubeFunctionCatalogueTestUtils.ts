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
} from '../graph-manager/CubeFunctionCatalogue.js';

/** A parameter: `[type, multiplicity, name?, description?]` */
type TestParameter = readonly [string, string, string?, string?];

/** A signature of the package's function, its id as the engine's: the package, then its name */
export const TEST__functionSignature = (
  packagePath: string,
  name: string,
  parameters: readonly TestParameter[],
  returned: readonly [string, string],
  documentation = '',
  options?: { isOperator?: boolean; isPlatformOnly?: boolean },
): CubeFunctionSignature =>
  new CubeFunctionSignature(
    `${packagePath}::${name}_${parameters.map(([type]) => type).join('_')}`,
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
    options?.isOperator ?? false,
    options?.isPlatformOnly ?? false,
  );

const STRING = 'meta::pure::functions::string';
const MATH = 'meta::pure::functions::math';
const COLLECTION = 'meta::pure::functions::collection';
const FLOW = 'meta::pure::functions::flow';
const MULTIPLICITY = 'meta::pure::functions::multiplicity';
const VARIANT = 'meta::pure::functions::variant::navigation';
const RELATION = 'meta::pure::functions::relation';

const fn = (
  name: string,
  ...signatures: CubeFunctionSignature[]
): CubeFunction =>
  new CubeFunction(
    name,
    [
      ...new Set(
        signatures.map((each) => each.id.slice(0, each.id.lastIndexOf('::'))),
      ),
    ],
    signatures,
  );

/**
 * A catalogue of a few functions, as the engine's documentation gives them:
 * text, number, empty-value and JSON functions, an operator's, one of many
 * values, and a relation's
 */
export const TEST__functionCatalogue = (): CubeFunctionCatalogue =>
  new CubeFunctionCatalogue([
    fn(
      'contains',
      TEST__functionSignature(
        STRING,
        'contains',
        [
          ['String', '1', 'source', 'the string to search in.'],
          ['String', '1', 'val', 'the substring to look for.'],
        ],
        ['Boolean', '1'],
        'Whether `source` contains `val` anywhere within it.',
      ),
      TEST__functionSignature(
        COLLECTION,
        'contains',
        [
          ['Any', '*', 'collection'],
          ['Any', '1', 'value'],
        ],
        ['Boolean', '1'],
        'Whether a collection contains a given value.',
      ),
    ),
    fn(
      'lpad',
      TEST__functionSignature(
        STRING,
        'lpad',
        [
          ['String', '1', 'str'],
          ['Integer', '1', 'length'],
          ['String', '1', 'char'],
        ],
        ['String', '1'],
        'Pads the beginning of a string.',
      ),
      TEST__functionSignature(
        STRING,
        'lpad',
        [
          ['String', '1'],
          ['Integer', '1'],
        ],
        ['String', '1'],
        'As `lpad`, padding with a space.',
      ),
    ),
    fn(
      'toUpper',
      TEST__functionSignature(
        STRING,
        'toUpper',
        [['String', '1', 'source']],
        ['String', '1'],
        'The string in upper case.',
      ),
    ),
    fn(
      'round',
      TEST__functionSignature(
        MATH,
        'round',
        [['Number', '1', 'number']],
        ['Integer', '1'],
        'Rounds a number to the nearest integer, half-even.',
      ),
      TEST__functionSignature(
        MATH,
        'round',
        [
          ['Float', '1'],
          ['Integer', '1'],
        ],
        ['Float', '1'],
        'Rounds a `Float` to a given number of decimal places.',
      ),
    ),
    fn(
      'plus',
      TEST__functionSignature(
        MATH,
        'plus',
        [['Number', '*']],
        ['Number', '1'],
        'Adds numbers.',
        { isOperator: true },
      ),
    ),
    fn(
      'sum',
      TEST__functionSignature(
        MATH,
        'sum',
        [['Number', '*']],
        ['Number', '1'],
        'Adds numbers.',
      ),
    ),
    fn(
      'coalesce',
      TEST__functionSignature(
        FLOW,
        'coalesce',
        [
          ['T', '0..1', 'value'],
          ['T', '1', 'otherwise'],
        ],
        ['T', '1'],
        'The value, or another when it is empty.',
      ),
    ),
    fn(
      'toOne',
      TEST__functionSignature(
        MULTIPLICITY,
        'toOne',
        [['T', '*', 'values']],
        ['T', '1'],
        'The one value.',
      ),
    ),
    fn(
      'isEmpty',
      TEST__functionSignature(
        COLLECTION,
        'isEmpty',
        [['Any', '*', 'values']],
        ['Boolean', '1'],
        'Whether there is no value.',
      ),
    ),
    fn(
      'get',
      TEST__functionSignature(
        VARIANT,
        'get',
        [
          ['Variant', '0..1', 'variant'],
          ['String', '1', 'key'],
        ],
        ['Variant', '0..1'],
        "A field's value.",
      ),
    ),
    fn(
      'map',
      TEST__functionSignature(
        COLLECTION,
        'map',
        [
          ['T', 'm', 'value'],
          ['Function<{T[1]->V[1]}>', '1', 'func'],
        ],
        ['V', 'm'],
        'Applies a function.',
      ),
    ),
    fn(
      'size',
      TEST__functionSignature(
        RELATION,
        'size',
        [['Relation<T>', '1', 'rel']],
        ['Integer', '1'],
        'The number of rows.',
        { isPlatformOnly: true },
      ),
    ),
  ]);
