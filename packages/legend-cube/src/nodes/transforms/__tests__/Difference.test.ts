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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import { column, enumColumn } from '../../../__test-utils__/CubeTestNodes.js';
import { Schema, type SchemaColumn } from '../../../schema/Schema.js';
import { PrimitiveType } from '../../../types/CubeType.js';
import {
  Difference,
  DIFFERENCE_SUFFIXES,
  type DifferenceSettings,
  getDifferenceOutputNames,
  getDifferenceResultType,
} from '../Difference.js';

const P = 'meta::pure::precisePrimitives::';

/** Each column as `name type`, with `?` when nullable, e.g. `ID Int` or `QTY_1 Int?` */
const describeColumns = (columns: readonly SchemaColumn[]): string[] =>
  columns.map((c) => `${c.name} ${c.type.displayName}${c.nullable ? '?' : ''}`);

const schema = (...columns: SchemaColumn[]): Schema => new Schema(columns);

const difference = (settings: Partial<DifferenceSettings>): Difference =>
  new Difference('difference101', settings);

const validationErrors = (
  node: Difference,
  left: Schema,
  right: Schema,
): string[] => {
  const errors: string[] = [];
  expect(node.validate([left, right], errors)).toBe(errors.length === 0);
  // validating without collecting errors gives the same verdict
  expect(node.validate([left, right])).toBe(errors.length === 0);
  return errors;
};

const outputOf = (node: Difference, left: Schema, right: Schema): string[] => {
  const output = node.schematize([left, right]);
  if (!output) {
    throw new Error(
      `Expected a valid difference, got: ${validationErrors(node, left, right).join(' | ')}`,
    );
  }
  return describeColumns(output.columns);
};

// last month's and this month's positions, by book
const LAST = schema(
  column('BOOK', `${P}Int`),
  column('DESK', `${P}Varchar`, true, [10]),
  column('QTY', `${P}Int`, true),
  column('PRICE', `${P}Double`, true),
);
const NOW = schema(
  column('BOOK', `${P}Int`),
  column('TRADER', `${P}Varchar`, false, [20]),
  column('QTY', `${P}Int`, true),
  column('PRICE', `${P}Double`, true),
);
const BY_BOOK: Partial<DifferenceSettings> = {
  leftColumns: ['BOOK'],
  rightColumns: ['BOOK'],
};

describe(unitTest('Difference node'), () => {
  test('Is a binary node with Left and Right ports, described as the spec says', () => {
    const node = new Difference('difference101');
    expect(node.type).toBe('difference');
    expect(Difference.TYPE).toBe('difference');
    expect(node.ports).toEqual(['tds1', 'tds2']);
    expect(node.portLabels).toEqual(['Left', 'Right']);
    expect(node.describe()).toBe('Compare Column Values');
  });

  test('Starts with no key columns and no difference columns', () => {
    const node = new Difference('difference101');
    expect(node.leftColumns).toEqual([]);
    expect(node.rightColumns).toEqual([]);
    expect(node.differenceColumns).toEqual([]);
    expect(Object.isFrozen(node.differenceColumns)).toBe(true);
  });

  test('Refuses settings that are not lists of names', () => {
    expect(
      () =>
        new Difference('difference101', {
          leftColumns: 'BOOK' as unknown as string[],
        }),
    ).toThrow('Difference join columns must be lists of column names');
    expect(
      () =>
        new Difference('difference101', {
          differenceColumns: [1] as unknown as string[],
        }),
    ).toThrow('Difference columns must be a list of column names');
  });

  test('Changes settings into a new node with the same id, and swaps its keys with its inputs', () => {
    const node = difference({
      leftColumns: ['BOOK'],
      rightColumns: ['BOOK_ID'],
      differenceColumns: ['QTY'],
    });
    const changed = node.withSettings({ differenceColumns: ['PRICE'] });
    expect(changed === node).toBe(false);
    expect(changed.id).toBe('difference101');
    expect(changed.leftColumns).toEqual(['BOOK']);
    expect(changed.differenceColumns).toEqual(['PRICE']);
    const swapped = node.withSwappedInputs();
    expect(swapped.leftColumns).toEqual(['BOOK_ID']);
    expect(swapped.rightColumns).toEqual(['BOOK']);
    expect(swapped.differenceColumns).toEqual(['QTY']);
  });

  test('Checks the keys as a join does, first', () => {
    expect(validationErrors(difference({}), LAST, NOW)).toEqual([
      'Left join columns cannot be empty.',
    ]);
    expect(
      validationErrors(
        difference({
          leftColumns: ['BOOK', 'DESK'],
          rightColumns: ['BOOK'],
          differenceColumns: ['QTY'],
        }),
        LAST,
        NOW,
      ),
    ).toEqual([
      'Number of left join columns must be the same as number of right join columns.',
    ]);
    expect(
      validationErrors(
        difference({
          leftColumns: ['BOOK', 'NOPE'],
          rightColumns: ['TRADER', 'BOOK'],
          differenceColumns: ['QTY'],
        }),
        LAST,
        NOW,
      ),
    ).toEqual([
      'Join columns "BOOK" and "TRADER" must be of compatible types.',
      'Left join column "NOPE" is not present in the input schema.',
    ]);
  });

  test('Then needs difference columns, none twice', () => {
    expect(validationErrors(difference(BY_BOOK), LAST, NOW)).toEqual([
      'Difference columns cannot be empty.',
    ]);
    expect(
      validationErrors(
        difference({ ...BY_BOOK, differenceColumns: ['QTY', 'QTY'] }),
        LAST,
        NOW,
      ),
    ).toEqual(['Difference columns cannot have duplicates.']);
  });

  test('Then checks every difference column: named, not a key, in both inputs, of one numeric type', () => {
    const left = schema(
      column('BOOK', `${P}Int`),
      column('QTY', `${P}Int`),
      column('PRICE', `${P}Double`),
      column('NAME', `${P}Varchar`, false, [10]),
      column('ONLY_LEFT', `${P}Int`),
    );
    const right = schema(
      column('BOOK', `${P}Int`),
      column('QTY', `${P}BigInt`),
      column('PRICE', `${P}Double`),
      column('NAME', `${P}Varchar`, false, [10]),
      column('ONLY_RIGHT', `${P}Int`),
    );
    expect(
      validationErrors(
        difference({
          ...BY_BOOK,
          differenceColumns: [
            '',
            'BOOK',
            'ONLY_LEFT',
            'ONLY_RIGHT',
            'NOPE',
            'QTY',
            'NAME',
            'PRICE',
          ],
        }),
        left,
        right,
      ),
    ).toEqual([
      'Difference column does not have a name.',
      'Difference column "BOOK" cannot be a join column.',
      'Right difference column "ONLY_LEFT" is not present in the input schema.',
      'Left difference column "ONLY_RIGHT" is not present in the input schema.',
      'Left difference column "NOPE" is not present in the input schema.',
      'Right difference column "NOPE" is not present in the input schema.',
      // strictly the same type, not compatible ones
      'Difference column "QTY" must have same type in both input schemas.',
      'Difference column "NAME" must be of numeric type.',
    ]);
  });

  test('Takes a right key as no difference column either', () => {
    expect(
      validationErrors(
        difference({
          leftColumns: ['BOOK'],
          rightColumns: ['QTY'],
          differenceColumns: ['QTY'],
        }),
        LAST,
        NOW,
      ),
    ).toEqual(['Difference column "QTY" cannot be a join column.']);
  });

  test('Then refuses another column name in both inputs, but its keys and difference columns', () => {
    expect(
      validationErrors(
        difference({ ...BY_BOOK, differenceColumns: ['QTY'] }),
        LAST,
        NOW,
      ),
    ).toEqual([
      'Duplicate column names between inputs are not supported if they are not part of the join columns: "PRICE"',
    ]);
  });

  test('Then refuses an output name an input already has, in any case, or that is too long', () => {
    const left = schema(
      column('BOOK', `${P}Int`),
      column('QTY', `${P}Int`),
      column('qty_1', `${P}Int`),
    );
    const right = schema(column('BOOK', `${P}Int`), column('QTY', `${P}Int`));
    expect(
      validationErrors(
        difference({ ...BY_BOOK, differenceColumns: ['QTY'] }),
        left,
        right,
      ),
    ).toEqual([
      'Difference output column "QTY_1" is already present in the input schema.',
    ]);
    const long = 'Q'.repeat(120);
    expect(
      validationErrors(
        difference({ ...BY_BOOK, differenceColumns: [long] }),
        schema(column('BOOK', `${P}Int`), column(long, `${P}Int`)),
        schema(column('BOOK', `${P}Int`), column(long, `${P}Int`)),
      ),
    ).toEqual([
      `Difference output column "${long}_valueDifference" is not valid column name.`,
    ]);
  });

  test('Refuses two output names that are one in any case', () => {
    const both = schema(
      column('BOOK', `${P}Int`),
      column('q', `${P}Int`),
      column('Q', `${P}Int`),
    );
    expect(
      validationErrors(
        difference({ ...BY_BOOK, differenceColumns: ['q', 'Q'] }),
        both,
        both,
      ),
    ).toEqual([
      'Difference output column "Q_1" is already present in the output schema.',
      'Difference output column "Q_2" is already present in the output schema.',
      'Difference output column "Q_valueDifference" is already present in the output schema.',
    ]);
  });

  test("Gives a full outer join's columns, then each difference column's three, suffix by suffix", () => {
    const node = difference({
      ...BY_BOOK,
      differenceColumns: ['QTY', 'PRICE'],
    });
    expect(outputOf(node, LAST, NOW)).toEqual([
      // the merged key: neither key is empty
      'BOOK Int',
      // a full outer join's other columns can be empty
      'DESK Varchar(10)?',
      'TRADER Varchar(20)?',
      'QTY_1 Int?',
      'PRICE_1 Double?',
      'QTY_2 Int?',
      'PRICE_2 Double?',
      'QTY_valueDifference Integer',
      'PRICE_valueDifference Float',
    ]);
  });

  test('Keeps both keys when their names differ, each of which can be empty', () => {
    const right = schema(
      column('BOOK_ID', `${P}Int`),
      column('QTY', `${P}Int`, true),
    );
    expect(
      outputOf(
        difference({
          leftColumns: ['BOOK'],
          rightColumns: ['BOOK_ID'],
          differenceColumns: ['QTY'],
        }),
        schema(column('BOOK', `${P}Int`), column('QTY', `${P}Int`, true)),
        right,
      ),
    ).toEqual([
      'BOOK Int?',
      'BOOK_ID Int?',
      'QTY_1 Int?',
      'QTY_2 Int?',
      'QTY_valueDifference Integer',
    ]);
  });

  test('Is invalid, with no schema, when any check fails', () => {
    expect(difference(BY_BOOK).schematize([LAST, NOW])).toBe(undefined);
  });
});

describe(unitTest('Difference types and names'), () => {
  test('Types each difference as the engine does: Integer, Float or Number by family', () => {
    const differenceOf = (path: string, params: number[] = []): string =>
      getDifferenceResultType(PrimitiveType.get(path, params))?.displayName ??
      'none';
    expect(differenceOf(`${P}TinyInt`)).toBe('Integer');
    expect(differenceOf(`${P}UBigInt`)).toBe('Integer');
    expect(differenceOf('Integer')).toBe('Integer');
    expect(differenceOf(`${P}Float4`)).toBe('Float');
    expect(differenceOf(`${P}Double`)).toBe('Float');
    expect(differenceOf('Float')).toBe('Float');
    expect(differenceOf(`${P}Numeric`, [10, 2])).toBe('Number');
    expect(differenceOf('Decimal')).toBe('Number');
    expect(differenceOf('Number')).toBe('Number');
    expect(differenceOf('String')).toBe('none');
    expect(
      getDifferenceResultType(
        enumColumn('REGION', 'test::Region', ['EMEA']).type,
      ),
    ).toBe(undefined);
  });

  test('Names the outputs suffix by suffix, not column by column', () => {
    expect(DIFFERENCE_SUFFIXES).toEqual(['_1', '_2', '_valueDifference']);
    expect(getDifferenceOutputNames(['a', 'b'])).toEqual([
      'a_1',
      'b_1',
      'a_2',
      'b_2',
      'a_valueDifference',
      'b_valueDifference',
    ]);
  });
});
