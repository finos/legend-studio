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
import {
  diffSchemas,
  PrimitiveType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  getAccessPointDriftWarning,
  getAccessPointRecheckWarning,
  getCubeWarehouseErrorHint,
} from '../LegendCubeDataProductLabels.js';
import { getSchemaDriftWarning } from '../LegendCubeLabels.js';

const P = 'meta::pure::precisePrimitives::';

const column = (name: string, type: string): SchemaColumn =>
  new SchemaColumn(name, PrimitiveType.get(`${P}${type}`), false);

/** Every kind of change: added, removed, changed and reordered */
const DIFF = diffSchemas(
  new Schema([
    column('ID', 'Int'),
    column('OLD', 'Int'),
    column('AT', 'Timestamp'),
  ]),
  new Schema([
    column('AT', 'Timestamp'),
    column('ID', 'BigInt'),
    column('NEW', 'Int'),
  ]),
);

describe("A data product access point's warnings", () => {
  test('Names the access point, listing the same changes a table lists', () => {
    expect(getAccessPointDriftWarning(DIFF)).toBe(
      'This access point changed since the cube was saved: added NEW; removed OLD; changed ID (Int to BigInt); reordered its columns',
    );
    expect(getSchemaDriftWarning(DIFF)).toBe(
      'This table changed since the cube was saved: added NEW; removed OLD; changed ID (Int to BigInt); reordered its columns',
    );
  });

  test("Says an access point it couldn't re-check keeps its saved columns", () => {
    expect(getAccessPointRecheckWarning('Boom')).toBe(
      'Could not re-check this access point, so it keeps its saved columns: Boom',
    );
  });

  test('Offers another warehouse only where the warehouse can be changed', () => {
    expect(getCubeWarehouseErrorHint('SALES_WH', true)).toBe(
      "The run couldn't use the warehouse SALES_WH. Pick another one in a data product source's panel.",
    );
    expect(getCubeWarehouseErrorHint('SALES_WH', false)).toBe(
      "The run couldn't use the warehouse SALES_WH.",
    );
  });
});
