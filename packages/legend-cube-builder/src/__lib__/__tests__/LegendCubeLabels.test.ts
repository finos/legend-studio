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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  diffSchemas,
  PrimitiveType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { getSchemaDriftWarning } from '../LegendCubeLabels.js';

const P = 'meta::pure::precisePrimitives::';

const column = (
  name: string,
  type: string,
  nullable = true,
  params: number[] = [],
): SchemaColumn =>
  new SchemaColumn(name, PrimitiveType.get(`${P}${type}`, params), nullable);

/** The warning on a table saved with `before` that the engine now types as `after` */
const driftWarning = (
  before: readonly SchemaColumn[],
  after: readonly SchemaColumn[],
): string =>
  getSchemaDriftWarning(diffSchemas(new Schema(before), new Schema(after)));

const PREFIX = 'This table changed since the cube was saved: ';

const ID = column('ID', 'Int', false);

beforeEach(() => {
  localStorage.clear();
});

describe('The warning on a table that changed since the cube was saved', () => {
  test('Lists every column added, in order', () => {
    expect(
      driftWarning(
        [ID],
        [ID, column('NAME', 'Varchar', true, [40]), column('CITY', 'Int')],
      ),
    ).toBe(`${PREFIX}added NAME, CITY`);
  });

  test('Lists every column removed, in order', () => {
    expect(
      driftWarning([ID, column('OLD', 'Int'), column('GONE', 'Int')], [ID]),
    ).toBe(`${PREFIX}removed OLD, GONE`);
  });

  test('Says when the columns only moved', () => {
    expect(
      driftWarning(
        [ID, column('NAME', 'Varchar', true, [40])],
        [column('NAME', 'Varchar', true, [40]), ID],
      ),
    ).toBe(`${PREFIX}reordered its columns`);
  });

  test('Marks no type with ? when neither column can be null', () => {
    expect(driftWarning([ID], [column('ID', 'BigInt', false)])).toBe(
      `${PREFIX}changed ID (Int to BigInt)`,
    );
  });

  test('Marks the type of a column that became nullable with ?', () => {
    expect(driftWarning([ID], [column('ID', 'Int')])).toBe(
      `${PREFIX}changed ID (Int to Int?)`,
    );
  });

  test('Lists every changed column, each type with its parameters', () => {
    expect(
      driftWarning(
        [column('NAME', 'Varchar', true, [15]), column('CODE', 'Int')],
        [column('NAME', 'Varchar', true, [40]), column('CODE', 'Int', false)],
      ),
    ).toBe(
      `${PREFIX}changed NAME (Varchar(15)? to Varchar(40)?), CODE (Int? to Int)`,
    );
  });

  test('Lists the changes of every kind, added, removed, changed then reordered, separated by semicolons', () => {
    expect(
      driftWarning(
        [ID, column('NAME', 'Varchar', true, [15]), column('OLD', 'Int')],
        [
          column('NAME', 'Varchar', true, [15]),
          column('ID', 'BigInt', false),
          column('NEW', 'Int'),
        ],
      ),
    ).toBe(
      `${PREFIX}added NEW; removed OLD; changed ID (Int to BigInt); reordered its columns`,
    );
  });
});
