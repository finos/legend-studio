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

import { test, expect, beforeAll, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import { TEST_DATA__ViewColumnTypes } from './TEST_DATA__ViewColumnTypes.js';
import type { GraphManagerState } from '../../../GraphManagerState.js';
import {
  TEST__buildGraphWithEntities,
  TEST__checkBuildingElementsRoundtrip,
  TEST__getTestGraphManagerState,
} from '../../../__test-utils__/GraphManagerTestUtils.js';
import {
  getColumn,
  getSchema,
  getView,
} from '../../../../graph/helpers/STO_Relational_Helper.js';
import {
  type RelationalDataType,
  Char,
  Decimal,
  Integer,
  Timestamp,
  VarChar,
} from '../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';

let graphManagerState: GraphManagerState;

beforeAll(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__ViewColumnTypes as Entity[],
  );
});

const expectViewColumn = (
  schemaName: string,
  viewName: string,
  columnName: string,
  type: RelationalDataType,
  nullable: boolean | undefined,
): void => {
  const database = graphManagerState.graph.getDatabase('test::db');
  const column = getColumn(
    getView(getSchema(database, schemaName), viewName),
    columnName,
  );
  // NOTE: `toStrictEqual` also checks the class, e.g. `Integer` vs `Timestamp`
  expect(column.type).toStrictEqual(type);
  expect(column.nullable).toBe(nullable);
};

// The view column placeholder, kept when the type can't be resolved
const PLACEHOLDER = new VarChar(50);

describe(unitTest('View column types'), () => {
  test('a plain column reference takes the type and nullability of the table column', () => {
    expectViewColumn('default', 'V', 'ID', new Integer(), false);
    expectViewColumn('default', 'V', 'AMT', new Decimal(10, 2), true);
    expectViewColumn('default', 'V', 'NAME', new VarChar(20), true);
    // the primary key holds the same (typed) columns
    const view = getView(
      getSchema(graphManagerState.graph.getDatabase('test::db'), 'default'),
      'V',
    );
    expect(view.primaryKey.map((col) => col.type)).toStrictEqual([
      new Integer(),
    ]);
  });

  test('a column of an included database table is resolved', () => {
    expectViewColumn('default', 'V_INC', 'ID', new Integer(), false);
    expectViewColumn('default', 'V_INC', 'CODE', new Char(3), false);
  });

  test('a computed column keeps the placeholder', () => {
    expectViewColumn('default', 'V', 'UPPER_NAME', PLACEHOLDER, undefined);
  });

  test('a column through a join takes the type but not the nullability', () => {
    // `OTHER.TS` is NOT NULL, but a join can still produce nulls
    expectViewColumn('default', 'V', 'OTHER_TS', new Timestamp(), undefined);
  });

  test('a view over a view built earlier is resolved', () => {
    expectViewColumn(
      'default',
      'V_OVER_V_BACKWARD',
      'ID',
      new Integer(),
      false,
    );
    expectViewColumn(
      'default',
      'V_OVER_V_BACKWARD',
      'AMT',
      new Decimal(10, 2),
      true,
    );
    expectViewColumn(
      'default',
      'V_OVER_V_BACKWARD',
      'NAME',
      new VarChar(20),
      true,
    );
    expectViewColumn(
      'default',
      'V_OVER_V_BACKWARD',
      'UPPER_NAME',
      PLACEHOLDER,
      undefined,
    );
    expectViewColumn(
      'default',
      'V_OVER_V_BACKWARD',
      'OTHER_TS',
      new Timestamp(),
      undefined,
    );
  });

  test('a view over a view built later falls back to the placeholder', () => {
    // same schema, declared after
    expectViewColumn(
      'default',
      'V_OVER_V_FORWARD',
      'ID',
      PLACEHOLDER,
      undefined,
    );
    expectViewColumn(
      'default',
      'V_OVER_V_FORWARD',
      'AMT',
      PLACEHOLDER,
      undefined,
    );
    // in a schema built later
    expectViewColumn('s1', 'EARLY_CROSS_SCHEMA', 'ID', PLACEHOLDER, undefined);
    expectViewColumn('s2', 'LATE_V', 'ID', new Integer(), false);
  });

  test('view column types change neither the protocol roundtrip nor the hash', async () => {
    await TEST__checkBuildingElementsRoundtrip(
      TEST_DATA__ViewColumnTypes as Entity[],
    );
  });
});
