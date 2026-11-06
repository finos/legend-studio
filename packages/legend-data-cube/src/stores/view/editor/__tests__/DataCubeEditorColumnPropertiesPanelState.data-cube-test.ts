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
import { autorun } from 'mobx';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import { TEST__DataCubeEngine } from '../../../__tests__/DataCubeTestUtils.js';
import { DataCubeEditorColumnPropertiesPanelState } from '../DataCubeEditorColumnPropertiesPanelState.js';
import { DataCubeEditorMutableColumnConfiguration } from '../DataCubeEditorMutableConfiguration.js';
import type { DataCubeEditorState } from '../DataCubeEditorState.js';
import { DataCubeColumnConfiguration } from '../../../core/model/DataCubeConfiguration.js';
import type { DataCubeColumn } from '../../../core/model/DataCubeColumn.js';
import {
  DataCubeColumnKind,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryAggregateOperator,
  type DataCubeOperationValue,
} from '../../../core/DataCubeQueryEngine.js';
import { getDefaultDecimals } from '../../../core/DataCubeColumnTypes.js';

const engine = new TEST__DataCubeEngine();

type TestColumn = {
  name: string;
  type: string;
  kind?: DataCubeColumnKind | undefined;
  isSelected?: boolean | undefined;
  excludedFromPivot?: boolean | undefined;
  aggregateOperator?: string | undefined;
  aggregationParameters?: DataCubeOperationValue[] | undefined;
};

function _panel(
  columns: TestColumn[],
  options?: {
    groupExtendColumns?: DataCubeColumn[] | undefined;
    horizontalPivotColumns?: DataCubeColumn[] | undefined;
  },
) {
  // NOTE: only the parts of the editor the panel reaches into are faked here
  const editor = {
    view: { engine },
    groupExtendColumns: options?.groupExtendColumns ?? [],
    horizontalPivots: {
      selector: { selectedColumns: options?.horizontalPivotColumns ?? [] },
    },
  } as unknown as DataCubeEditorState;
  const panel = new DataCubeEditorColumnPropertiesPanelState(editor);
  panel.setColumns(
    columns.map((column) => {
      const configuration = new DataCubeColumnConfiguration(
        column.name,
        column.type,
      );
      configuration.kind = column.kind ?? DataCubeColumnKind.MEASURE;
      configuration.isSelected = column.isSelected ?? true;
      configuration.excludedFromPivot =
        column.excludedFromPivot ??
        configuration.kind === DataCubeColumnKind.DIMENSION;
      configuration.decimals = getDefaultDecimals(column);
      configuration.aggregateOperator =
        column.aggregateOperator ?? DataCubeQueryAggregateOperator.SUM;
      configuration.aggregationParameters = column.aggregationParameters ?? [];
      return DataCubeEditorMutableColumnConfiguration.create(
        configuration.serialize(),
        undefined,
        engine.aggregateOperations,
      );
    }),
  );
  return panel;
}

function _operators(
  panel: DataCubeEditorColumnPropertiesPanelState,
  name: string,
) {
  return panel
    .getCompatibleAggregateOperations(panel.getColumnConfiguration(name))
    .map((operation) => operation.operator);
}

const PRICE = { name: 'Price', type: PRIMITIVE_TYPE.FLOAT };
const QTY = { name: 'Qty', type: PRIMITIVE_TYPE.INTEGER };
const DESK = {
  name: 'Desk',
  type: PRIMITIVE_TYPE.STRING,
  kind: DataCubeColumnKind.DIMENSION,
  aggregateOperator: DataCubeQueryAggregateOperator.UNIQUE,
};

function _parameterColumns(
  panel: DataCubeEditorColumnPropertiesPanelState,
  name: string,
) {
  return panel
    .getAggregationParameterColumns(panel.getColumnConfiguration(name))
    .map((col) => col.name);
}

const YEAR = {
  name: 'Year',
  type: PRIMITIVE_TYPE.INTEGER,
  kind: DataCubeColumnKind.DIMENSION,
};

const WEIGHTED_BY_QTY = {
  aggregateOperator: DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
  aggregationParameters: [
    { type: DataCubeOperationAdvancedValueType.COLUMN, value: 'Qty' },
  ],
};

describe(unitTest('Column properties: aggregation parameter columns'), () => {
  test('only other selected columns can be referenced by aggregations', () => {
    const panel = _panel([PRICE, DESK, { ...QTY, isSelected: false }]);
    expect(_parameterColumns(panel, 'Price')).toEqual(['Desk']);
  });

  test('group-level extended columns cannot be referenced by aggregations', () => {
    const panel = _panel([PRICE, QTY, DESK], { groupExtendColumns: [QTY] });
    expect(_parameterColumns(panel, 'Price')).toEqual(['Desk']);
  });

  test('horizontal pivot columns cannot be referenced by aggregations', () => {
    const panel = _panel([PRICE, QTY, DESK], { horizontalPivotColumns: [QTY] });
    expect(_parameterColumns(panel, 'Price')).toEqual(['Desk']);
  });

  test('aggregations of measures aggregated by pivot can reference any column kept by pivot', () => {
    const panel = _panel(
      [
        PRICE,
        QTY,
        { ...PRICE, name: 'Notional', excludedFromPivot: true },
        YEAR,
      ],
      { horizontalPivotColumns: [YEAR] },
    );
    expect(_parameterColumns(panel, 'Price')).toEqual(['Qty', 'Notional']);
  });

  test('aggregations of columns not aggregated by pivot cannot reference measures aggregated by pivot', () => {
    // after pivot(), measures aggregated by pivot() only exist as pivot result columns
    const panel = _panel(
      [
        { ...PRICE, excludedFromPivot: true },
        QTY,
        { ...PRICE, name: 'Notional', excludedFromPivot: true },
        { ...QTY, name: 'Lots', kind: DataCubeColumnKind.DIMENSION },
        YEAR,
      ],
      { horizontalPivotColumns: [YEAR] },
    );
    expect(_parameterColumns(panel, 'Price')).toEqual(['Notional', 'Lots']);
    expect(_parameterColumns(panel, 'Lots')).toEqual(['Price', 'Notional']);
  });

  test('without horizontal pivot, any selected column can be referenced regardless of pivot exclusion', () => {
    const panel = _panel([{ ...PRICE, excludedFromPivot: true }, QTY]);
    expect(_parameterColumns(panel, 'Price')).toEqual(['Qty']);
  });
});

describe(unitTest('Column properties: available aggregations'), () => {
  test('weighted average is available when another numeric column is selected', () => {
    const panel = _panel([PRICE, QTY, DESK]);
    expect(_operators(panel, 'Price')).toContain(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
  });

  test('two-column aggregations are not available without another numeric column', () => {
    const operators = _operators(_panel([PRICE, DESK]), 'Price');
    expect(operators).toContain(DataCubeQueryAggregateOperator.SUM);
    expect(operators).not.toContain(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
    expect(operators).not.toContain(DataCubeQueryAggregateOperator.CORRELATION);
  });

  test('weighted average is not available when the weight column is unselected', () => {
    expect(
      _operators(_panel([PRICE, { ...QTY, isSelected: false }]), 'Price'),
    ).not.toContain(DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE);
  });

  test('weighted average is not available when the weight column is a horizontal pivot column', () => {
    expect(
      _operators(
        _panel([PRICE, QTY], { horizontalPivotColumns: [QTY] }),
        'Price',
      ),
    ).not.toContain(DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE);
  });

  test('aggregations are offered according to the column type', () => {
    const panel = _panel([
      PRICE,
      QTY,
      DESK,
      {
        name: 'Active',
        type: PRIMITIVE_TYPE.BOOLEAN,
        kind: DataCubeColumnKind.DIMENSION,
        aggregateOperator: DataCubeQueryAggregateOperator.ANY,
      },
    ]);
    expect(_operators(panel, 'Active')).toEqual([
      DataCubeQueryAggregateOperator.ALL,
      DataCubeQueryAggregateOperator.ANY,
    ]);
    // a text column can take the value at the maximum of a numeric column,
    // but numeric aggregations are not available
    const deskOperators = _operators(panel, 'Desk');
    expect(deskOperators).toContain(DataCubeQueryAggregateOperator.MAX_BY);
    expect(deskOperators).not.toContain(DataCubeQueryAggregateOperator.MEDIAN);
    expect(deskOperators).not.toContain(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
  });

  test('a leaf-level copy of a column can take a different aggregation', () => {
    // e.g. the sum and the weighted average of the price, side by side
    const panel = _panel([PRICE, QTY, { ...PRICE, name: 'Price (wavg)' }]);
    const copy = panel.getColumnConfiguration('Price (wavg)');
    panel.setAggregateOperation(
      copy,
      engine.getAggregateOperation(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      ),
    );
    expect(copy.aggregateOperator).toBe(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
    expect(panel.getColumnConfiguration('Price').aggregateOperator).toBe(
      DataCubeQueryAggregateOperator.SUM,
    );
  });
});

describe(unitTest('Column properties: changing the aggregation'), () => {
  test('choosing weighted average picks another numeric column as weight', () => {
    const panel = _panel([DESK, PRICE, QTY]);
    const price = panel.getColumnConfiguration('Price');
    panel.setAggregateOperation(
      price,
      engine.getAggregateOperation(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      ),
    );
    expect(price.aggregateOperator).toBe(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
    expect(price.aggregationParameters).toEqual([
      { type: DataCubeOperationAdvancedValueType.COLUMN, value: 'Qty' },
    ]);
  });

  test('choosing weighted average picks a measure as weight over a dimension', () => {
    const panel = _panel([PRICE, YEAR, QTY]);
    const price = panel.getColumnConfiguration('Price');
    panel.setAggregateOperation(
      price,
      engine.getAggregateOperation(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      ),
    );
    expect(price.aggregationParameters).toEqual([
      { type: DataCubeOperationAdvancedValueType.COLUMN, value: 'Qty' },
    ]);
  });

  test('choosing weighted average picks a dimension as weight when there is no other measure', () => {
    const panel = _panel([PRICE, YEAR]);
    const price = panel.getColumnConfiguration('Price');
    panel.setAggregateOperation(
      price,
      engine.getAggregateOperation(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      ),
    );
    expect(price.aggregationParameters).toEqual([
      { type: DataCubeOperationAdvancedValueType.COLUMN, value: 'Year' },
    ]);
  });

  test('choosing the current aggregation again keeps edited parameters', () => {
    const panel = _panel([
      PRICE,
      QTY,
      { name: 'Notional', type: PRIMITIVE_TYPE.FLOAT },
    ]);
    const price = panel.getColumnConfiguration('Price');
    const wavg = engine.getAggregateOperation(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
    panel.setAggregateOperation(price, wavg);
    price.setAggregationParameters([
      { type: DataCubeOperationAdvancedValueType.COLUMN, value: 'Notional' },
    ]);
    panel.setAggregateOperation(price, wavg);
    expect(price.aggregationParameters).toEqual([
      { type: DataCubeOperationAdvancedValueType.COLUMN, value: 'Notional' },
    ]);
  });

  test('switching to an aggregation without parameters clears parameters', () => {
    const panel = _panel([PRICE, QTY]);
    const price = panel.getColumnConfiguration('Price');
    panel.setAggregateOperation(
      price,
      engine.getAggregateOperation(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      ),
    );
    panel.setAggregateOperation(
      price,
      engine.getAggregateOperation(DataCubeQueryAggregateOperator.SUM),
    );
    expect(price.aggregationParameters).toEqual([]);
  });

  test('choosing percentile sets a default percentile', () => {
    const panel = _panel([PRICE]);
    const price = panel.getColumnConfiguration('Price');
    panel.setAggregateOperation(
      price,
      engine.getAggregateOperation(DataCubeQueryAggregateOperator.PERCENTILE),
    );
    expect(price.aggregationParameters).toEqual([
      { type: PRIMITIVE_TYPE.FLOAT, value: 0.5 },
    ]);
  });
});

describe(unitTest('Column properties: number of decimals'), () => {
  test('integer columns show decimals when aggregated into fractional values', () => {
    const panel = _panel([PRICE, QTY]);
    const qty = panel.getColumnConfiguration('Qty');
    expect(qty.decimals).toBe(0);
    panel.setAggregateOperation(
      qty,
      engine.getAggregateOperation(DataCubeQueryAggregateOperator.CORRELATION),
    );
    expect(qty.decimals).toBe(2);
    panel.setAggregateOperation(
      qty,
      engine.getAggregateOperation(DataCubeQueryAggregateOperator.SUM),
    );
    expect(qty.decimals).toBe(0);
  });

  test('customized number of decimals is kept when changing the aggregation', () => {
    const panel = _panel([PRICE, QTY]);
    const qty = panel.getColumnConfiguration('Qty');
    qty.setDecimals(1);
    panel.setAggregateOperation(
      qty,
      engine.getAggregateOperation(DataCubeQueryAggregateOperator.AVERAGE),
    );
    expect(qty.decimals).toBe(1);
  });

  test('number of decimals of non-integer columns is not changed', () => {
    const panel = _panel([PRICE, QTY]);
    const price = panel.getColumnConfiguration('Price');
    panel.setAggregateOperation(
      price,
      engine.getAggregateOperation(DataCubeQueryAggregateOperator.MEDIAN),
    );
    expect(price.decimals).toBe(2);
  });
});

describe(
  unitTest('Column properties: unavailable aggregation parameter columns'),
  () => {
    test('aggregation falls back to the default when the weight column is unselected', () => {
      const panel = _panel([{ ...PRICE, ...WEIGHTED_BY_QTY }, QTY]);
      panel.getColumnConfiguration('Qty').setIsSelected(false);
      panel.adaptPropagatedChanges();
      const price = panel.getColumnConfiguration('Price');
      expect(price.aggregateOperator).toBe(DataCubeQueryAggregateOperator.SUM);
      expect(price.aggregateOperation.operator).toBe(
        DataCubeQueryAggregateOperator.SUM,
      );
      expect(price.aggregationParameters).toEqual([]);
    });

    test('aggregation falls back to the default when the weight column is used for horizontal pivot', () => {
      const panel = _panel([{ ...PRICE, ...WEIGHTED_BY_QTY }, QTY], {
        horizontalPivotColumns: [QTY],
      });
      panel.adaptPropagatedChanges();
      expect(panel.getColumnConfiguration('Price').aggregateOperator).toBe(
        DataCubeQueryAggregateOperator.SUM,
      );
    });

    test('aggregation falls back to the default when the column is excluded from pivot but its weight column is not', () => {
      const panel = _panel(
        [{ ...PRICE, ...WEIGHTED_BY_QTY, excludedFromPivot: true }, QTY, YEAR],
        { horizontalPivotColumns: [YEAR] },
      );
      panel.adaptPropagatedChanges();
      expect(panel.getColumnConfiguration('Price').aggregateOperator).toBe(
        DataCubeQueryAggregateOperator.SUM,
      );
    });

    test('aggregation is kept when the weight column is available', () => {
      const panel = _panel(
        [
          { ...PRICE, ...WEIGHTED_BY_QTY, excludedFromPivot: true },
          { ...QTY, excludedFromPivot: true },
          YEAR,
        ],
        { horizontalPivotColumns: [YEAR] },
      );
      panel.adaptPropagatedChanges();
      const price = panel.getColumnConfiguration('Price');
      expect(price.aggregateOperator).toBe(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      );
      expect(price.aggregationParameters).toEqual(
        WEIGHTED_BY_QTY.aggregationParameters,
      );
    });

    test('aggregation of a text column falls back to its default', () => {
      const panel = _panel([
        {
          ...DESK,
          aggregateOperator: DataCubeQueryAggregateOperator.MAX_BY,
          aggregationParameters: WEIGHTED_BY_QTY.aggregationParameters,
        },
        { ...QTY, isSelected: false },
      ]);
      panel.adaptPropagatedChanges();
      expect(panel.getColumnConfiguration('Desk').aggregateOperator).toBe(
        DataCubeQueryAggregateOperator.UNIQUE,
      );
    });
  },
);

describe(unitTest('Column properties: selected column'), () => {
  test('aggregations and parameter columns of the selected column follow changes while observed', () => {
    const panel = _panel([PRICE, QTY]);
    panel.setSelectedColumnName('Price');
    // NOTE: observe these, as the panel does, so they are cached and only recomputed on changes
    let operators: string[] = [];
    let parameterColumns: string[] = [];
    const dispose = autorun(() => {
      operators = panel.selectedColumnCompatibleAggregateOperations.map(
        (operation) => operation.operator,
      );
      parameterColumns = panel.selectedColumnAggregationParameterColumns.map(
        (col) => col.name,
      );
    });
    expect(operators).toContain(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
    expect(parameterColumns).toEqual(['Qty']);

    panel.getColumnConfiguration('Qty').setIsSelected(false);
    expect(operators).not.toContain(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
    expect(parameterColumns).toEqual([]);
    dispose();
  });
});
