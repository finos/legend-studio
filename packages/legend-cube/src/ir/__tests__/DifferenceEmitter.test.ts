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
import { listOrigins } from '../../__test-utils__/CubeIRTestUtils.js';
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import {
  Difference,
  type DifferenceSettings,
} from '../../nodes/transforms/Difference.js';
import type { SchemaColumn } from '../../schema/Schema.js';
import type { IR } from '../CubeIR.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const P = 'meta::pure::precisePrimitives::';
const KIND = 'meta::pure::functions::relation::JoinKind';
const L = '#>{test::Northwind.NORTHWIND.L}#';
const R = '#>{test::Northwind.NORTHWIND.R}#';

const emitIR = (
  leftColumns: SchemaColumn[],
  rightColumns: SchemaColumn[],
  settings: Partial<DifferenceSettings>,
): IR =>
  new QueryEmitter(
    new Query(
      [
        resolvedTable('relational101', 'L', leftColumns),
        resolvedTable('relational102', 'R', rightColumns),
        new Difference('difference101', settings),
      ],
      [
        new Connection('relational101', 'difference101', 'tds1'),
        new Connection('relational102', 'difference101', 'tds2'),
      ],
      'difference101',
    ),
  ).emitRelation('difference101');

const emit = (
  leftColumns: SchemaColumn[],
  rightColumns: SchemaColumn[],
  settings: Partial<DifferenceSettings>,
): string => printIR(emitIR(leftColumns, rightColumns, settings));

const LAST = [
  column('BOOK', `${P}Int`),
  column('DESK', `${P}Varchar`, true, [10]),
  column('QTY', `${P}Int`, true),
  column('PRICE', `${P}Double`, true),
];
const NOW = [
  column('BOOK', `${P}Int`),
  column('TRADER', `${P}Varchar`, false, [20]),
  column('QTY', `${P}Int`, true),
  column('PRICE', `${P}Double`, true),
];

const BY_BOOK: Partial<DifferenceSettings> = {
  leftColumns: ['BOOK'],
  rightColumns: ['BOOK'],
};

describe(unitTest('Difference emission'), () => {
  test('Renames the difference columns on each side, joins FULL, subtracts with empty values as 0, then selects', () => {
    expect(
      emit(LAST, NOW, { ...BY_BOOK, differenceColumns: ['QTY', 'PRICE'] }),
    ).toBe(
      `${L}->rename(~QTY, ~QTY_1)->rename(~PRICE, ~PRICE_1)->rename(~BOOK, ~BOOK__cube_l)` +
        `->join(${R}->rename(~QTY, ~QTY_2)->rename(~PRICE, ~PRICE_2)->rename(~BOOK, ~BOOK__cube_r), ` +
        `${KIND}.FULL, {l, r | $l.BOOK__cube_l == $r.BOOK__cube_r})` +
        `->extend(~[BOOK: x | $x.BOOK__cube_l->coalesce($x.BOOK__cube_r)])` +
        // an integer's 0, and a float's 0.0, so the difference is Float
        `->extend(~[QTY_valueDifference: x | [$x.QTY_1->coalesce(0), $x.QTY_2->coalesce(0)]->minus(), ` +
        `PRICE_valueDifference: x | [$x.PRICE_1->coalesce(0.0), $x.PRICE_2->coalesce(0.0)]->minus()])` +
        `->select(~[BOOK, DESK, TRADER, QTY_1, PRICE_1, QTY_2, PRICE_2, QTY_valueDifference, PRICE_valueDifference])`,
    );
  });

  test('Joins on keys whose names differ with no merge, and subtracts decimals from 0', () => {
    const amount = column('AMT', `${P}Numeric`, true, [10, 2]);
    expect(
      emit(
        [column('BOOK', `${P}Int`), amount],
        [column('BOOK_ID', `${P}Int`), amount],
        {
          leftColumns: ['BOOK'],
          rightColumns: ['BOOK_ID'],
          differenceColumns: ['AMT'],
        },
      ),
    ).toBe(
      `${L}->rename(~AMT, ~AMT_1)` +
        `->join(${R}->rename(~AMT, ~AMT_2), ${KIND}.FULL, {l, r | $l.BOOK == $r.BOOK_ID})` +
        `->extend(~[AMT_valueDifference: x | [$x.AMT_1->coalesce(0), $x.AMT_2->coalesce(0)]->minus()])` +
        `->select(~[BOOK, BOOK_ID, AMT_1, AMT_2, AMT_valueDifference])`,
    );
  });

  test('Marks every part with the difference, so an engine error lands on it', () => {
    const origins = listOrigins(
      emitIR(LAST.slice(0, 3), NOW.slice(0, 3), {
        ...BY_BOOK,
        differenceColumns: ['QTY'],
      }),
    );
    expect(origins.slice(0, 2)).toEqual([
      'select@difference101:select',
      'extend@difference101:difference',
    ]);
    expect(origins).toContain('rename@difference101:rename');
    expect(origins).toContain('join@difference101:join');
    expect(origins).toContain('coalesce@difference101:coalesce');
    expect(origins).toContain('minus@difference101:difference');
    expect(origins).toContain('coalesce@difference101:difference');
    expect(origins).toContain('0@difference101:difference');
  });
});
