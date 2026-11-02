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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import { newColumnConfiguration } from '../DataCubeConfigurationBuilder.js';
import {
  DataCubeColumnKind,
  DataCubeQueryAggregateOperator,
  DataCubeQuerySortDirection,
} from '../DataCubeQueryEngine.js';
import {
  DataCubeSnapshot,
  type DataCubeSnapshotAggregateColumn,
  type DataCubeSnapshotSortColumn,
} from '../DataCubeSnapshot.js';
import type { DataCubeColumn } from '../model/DataCubeColumn.js';

describe(unitTest('Column configuration: pivot'), () => {
  const newContext = (options?: {
    pivotColumns?: DataCubeColumn[];
    pivotAggColumns?: DataCubeSnapshotAggregateColumn[];
    pivotSortColumns?: DataCubeSnapshotSortColumn[];
  }): Parameters<typeof newColumnConfiguration>[1] => {
    const snapshot = DataCubeSnapshot.create({});
    Object.assign(snapshot.data, {
      pivot: { columns: options?.pivotColumns ?? [], castColumns: [] },
    });
    return {
      snapshot,
      pivotAggColumns: options?.pivotAggColumns,
      pivotSortColumns: options?.pivotSortColumns,
    };
  };

  test('excludes a pivoted dimension column from the pivot', () => {
    const config = newColumnConfiguration(
      { name: 'region', type: PRIMITIVE_TYPE.STRING },
      newContext({
        pivotColumns: [{ name: 'region', type: PRIMITIVE_TYPE.STRING }],
      }),
    );
    expect(config.kind).toBe(DataCubeColumnKind.DIMENSION);
    expect(config.excludedFromPivot).toBe(true);
  });

  test('includes a pivot aggregate column in the pivot and sets its aggregation', () => {
    const config = newColumnConfiguration(
      { name: 'amount', type: PRIMITIVE_TYPE.INTEGER },
      newContext({
        pivotAggColumns: [
          {
            name: 'amount',
            type: PRIMITIVE_TYPE.INTEGER,
            operator: DataCubeQueryAggregateOperator.SUM,
            parameterValues: [],
          },
        ],
      }),
    );
    expect(config.excludedFromPivot).toBe(false);
    expect(config.aggregateOperator).toBe(DataCubeQueryAggregateOperator.SUM);
  });

  test('excludes a non-aggregated, non-pivoted column from the pivot', () => {
    const config = newColumnConfiguration(
      { name: 'note', type: PRIMITIVE_TYPE.STRING },
      newContext(),
    );
    expect(config.excludedFromPivot).toBe(true);
  });

  test('sets the pivot sort direction of a pivot-sorted column', () => {
    const config = newColumnConfiguration(
      { name: 'amount', type: PRIMITIVE_TYPE.INTEGER },
      newContext({
        pivotSortColumns: [
          {
            name: 'amount',
            type: PRIMITIVE_TYPE.INTEGER,
            direction: DataCubeQuerySortDirection.DESCENDING,
          },
        ],
      }),
    );
    expect(config.pivotSortDirection).toBe(
      DataCubeQuerySortDirection.DESCENDING,
    );
  });

  test('does not set a pivot sort direction when there is no matching pivot sort column', () => {
    const config = newColumnConfiguration(
      { name: 'amount', type: PRIMITIVE_TYPE.INTEGER },
      newContext(),
    );
    expect(config.pivotSortDirection).toBeUndefined();
  });
});
