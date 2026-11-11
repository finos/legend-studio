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
import { describe, expect, jest, test } from '@jest/globals';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import { TEST__DataCubeEngine } from '../../../__tests__/DataCubeTestUtils.js';
import { DataCubeGridControllerState } from '../DataCubeGridControllerState.js';
import type { DataCubeViewState } from '../../DataCubeViewState.js';
import { DataCubeSnapshot } from '../../../core/DataCubeSnapshot.js';
import {
  type DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../../../core/model/DataCubeConfiguration.js';
import { newColumnConfiguration } from '../../../core/DataCubeConfigurationBuilder.js';
import {
  DataCubeGridMode,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryAggregateOperator,
  PIVOT_COLUMN_NAME_VALUE_SEPARATOR,
} from '../../../core/DataCubeQueryEngine.js';
import type { PlainObject } from '@finos/legend-shared';
import { getDefaultDecimals } from '../../../core/DataCubeColumnTypes.js';

const PRICE = { name: 'Price', type: PRIMITIVE_TYPE.FLOAT };
const QTY = { name: 'Qty', type: PRIMITIVE_TYPE.FLOAT };
const YEAR = { name: 'Year', type: PRIMITIVE_TYPE.STRING };

const _pivotResultCol = (value: string, column: { name: string }) => ({
  name: `${value}${PIVOT_COLUMN_NAME_VALUE_SEPARATOR}${column.name}`,
  type: PRIMITIVE_TYPE.FLOAT,
});

/**
 * Price is the weighted average of Qty, both pivoted by Year
 */
async function _controller(options?: {
  qtyExcludedFromPivot?: boolean;
  priceType?: string;
}) {
  const priceColumn = { ...PRICE, type: options?.priceType ?? PRICE.type };
  const configuration = new DataCubeConfiguration();
  configuration.columns = [priceColumn, QTY, YEAR].map((column) => {
    const config = newColumnConfiguration(column);
    config.isSelected = true;
    return config;
  });
  const price = configuration.columns[0] as DataCubeColumnConfiguration;
  price.aggregateOperator = DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE;
  price.aggregationParameters = [
    { type: DataCubeOperationAdvancedValueType.COLUMN, value: QTY.name },
  ];
  price.decimals = getDefaultDecimals(price, { hasFractionalValues: true });
  (configuration.columns[1] as DataCubeColumnConfiguration).excludedFromPivot =
    Boolean(options?.qtyExcludedFromPivot);

  const snapshot = DataCubeSnapshot.create({});
  snapshot.data.sourceColumns = [priceColumn, QTY, YEAR];
  snapshot.data.selectColumns = [priceColumn, QTY, YEAR];
  snapshot.data.pivot = {
    columns: [YEAR],
    castColumns: [
      _pivotResultCol('2024', PRICE),
      ...(options?.qtyExcludedFromPivot
        ? [QTY]
        : [_pivotResultCol('2024', QTY)]),
    ],
  };
  snapshot.data.configuration = configuration.serialize();
  snapshot.finalize();

  const broadcastSnapshot = jest.fn<(snapshot: DataCubeSnapshot) => void>();
  const controller = new DataCubeGridControllerState({
    engine: new TEST__DataCubeEngine(),
    settingService: { getBooleanValue: () => false },
    snapshotService: { broadcastSnapshot },
    info: { configuration: { gridMode: DataCubeGridMode.STANDARD } },
  } as unknown as DataCubeViewState);
  await controller.receiveSnapshot(snapshot);
  return { controller, broadcastSnapshot };
}

function _publishedPrice(
  broadcastSnapshot: jest.Mock<(snapshot: DataCubeSnapshot) => void>,
) {
  const snapshot = broadcastSnapshot.mock.calls.at(-1)?.[0];
  return DataCubeConfiguration.serialization
    .fromJson(
      snapshot?.data.configuration as PlainObject<DataCubeConfiguration>,
    )
    .columns.find((col) => col.name === PRICE.name);
}

describe(unitTest('Grid controller: aggregation parameter columns'), () => {
  test('excluding a column from pivot falls back to the default aggregation when it references a pivoted column', async () => {
    const { controller, broadcastSnapshot } = await _controller();
    controller.excludeColumnFromHorizontalPivot(
      _pivotResultCol('2024', PRICE).name,
    );
    const price = _publishedPrice(broadcastSnapshot);
    expect(price?.excludedFromPivot).toBe(true);
    expect(price?.aggregateOperator).toBe(DataCubeQueryAggregateOperator.SUM);
    expect(price?.aggregationParameters).toEqual([]);
  });

  test('falling back to the default aggregation adjusts the number of decimals of integer columns', async () => {
    const { controller, broadcastSnapshot } = await _controller({
      priceType: PRIMITIVE_TYPE.INTEGER,
    });
    controller.excludeColumnFromHorizontalPivot(
      _pivotResultCol('2024', PRICE).name,
    );
    const price = _publishedPrice(broadcastSnapshot);
    expect(price?.aggregateOperator).toBe(DataCubeQueryAggregateOperator.SUM);
    expect(price?.decimals).toBe(0);
  });

  test('excluding a column from pivot keeps the aggregation when it references a column also excluded from pivot', async () => {
    const { controller, broadcastSnapshot } = await _controller({
      qtyExcludedFromPivot: true,
    });
    controller.excludeColumnFromHorizontalPivot(
      _pivotResultCol('2024', PRICE).name,
    );
    const price = _publishedPrice(broadcastSnapshot);
    expect(price?.excludedFromPivot).toBe(true);
    expect(price?.aggregateOperator).toBe(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
    expect(price?.aggregationParameters).toEqual([
      { type: DataCubeOperationAdvancedValueType.COLUMN, value: QTY.name },
    ]);
  });
});
