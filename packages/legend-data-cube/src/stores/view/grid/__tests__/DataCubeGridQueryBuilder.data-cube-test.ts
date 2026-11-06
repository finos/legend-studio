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
import {
  matchFunctionName,
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_Lambda,
  V1_Variable,
  type V1_ColSpec,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { TEST__DataCubeEngine } from '../../../__tests__/DataCubeTestUtils.js';
import { buildGridDataFetchExecutableQuery } from '../DataCubeGridQueryBuilder.js';
import type { DataCubeGridClientDataFetchRequest } from '../DataCubeGridClientEngine.js';
import { DataCubeSnapshot } from '../../../core/DataCubeSnapshot.js';
import {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../../../core/model/DataCubeConfiguration.js';
import {
  INTERNAL__DataCubeSource,
  type DataCubeSource,
} from '../../../core/model/DataCubeSource.js';
import type { DataCubeColumn } from '../../../core/model/DataCubeColumn.js';
import {
  DataCubeColumnKind,
  DataCubeFunction,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryAggregateOperator,
  type DataCubeOperationValue,
} from '../../../core/DataCubeQueryEngine.js';
import { _primitiveValue } from '../../../core/DataCubeQueryBuilderUtils.js';
import { _colSpecArrayParam } from '../../../core/DataCubeSnapshotBuilderUtils.js';

class TEST__GridQueryDataCubeEngine extends TEST__DataCubeEngine {
  override buildExecutionContext(
    source: DataCubeSource,
  ): V1_AppliedFunction | undefined {
    return undefined;
  }
}

const engine = new TEST__GridQueryDataCubeEngine();

// --------------------------------- HELPERS ---------------------------------

type TestColumn = DataCubeColumn & {
  kind: DataCubeColumnKind;
  aggregateOperator: string;
  aggregationParameters?: DataCubeOperationValue[] | undefined;
};

function _snapshot(
  columns: TestColumn[],
  groupBy: string[],
  pivot?: { columns: string[]; castColumns: DataCubeColumn[] } | undefined,
) {
  const configuration = new DataCubeConfiguration();
  configuration.columns = columns.map((column) => {
    const columnConfiguration = new DataCubeColumnConfiguration(
      column.name,
      column.type,
    );
    columnConfiguration.kind = column.kind;
    columnConfiguration.aggregateOperator = column.aggregateOperator;
    columnConfiguration.aggregationParameters =
      column.aggregationParameters ?? [];
    return columnConfiguration;
  });
  const _col = (column: DataCubeColumn) => ({
    name: column.name,
    type: column.type,
  });
  const snapshot = DataCubeSnapshot.create(configuration.serialize());
  snapshot.data.sourceColumns = columns.map(_col);
  snapshot.data.selectColumns = columns.map(_col);
  const _getCol = (name: string) =>
    _col(guaranteeNonNullable(columns.find((col) => col.name === name)));
  snapshot.data.groupBy = {
    columns: groupBy.map(_getCol),
  };
  if (pivot) {
    snapshot.data.pivot = {
      columns: pivot.columns.map(_getCol),
      castColumns: pivot.castColumns,
    };
  }
  return snapshot;
}

function _buildQuery(snapshot: DataCubeSnapshot, groupKeys: string[]) {
  const source = new INTERNAL__DataCubeSource();
  source.query = _primitiveValue(PRIMITIVE_TYPE.STRING, '');
  const request: DataCubeGridClientDataFetchRequest = {
    startRow: undefined,
    endRow: undefined,
    rowGroupColumns: [],
    groupKeys,
    pivotColumns: [],
    sortColumns: [],
  };
  return buildGridDataFetchExecutableQuery(
    request,
    snapshot,
    source,
    engine,
    false,
  );
}

/**
 * Lists the functions of the query, in the order they are applied
 */
function _functions(query: V1_ValueSpecification) {
  const functions: V1_AppliedFunction[] = [];
  let current = query;
  while (current instanceof V1_AppliedFunction) {
    functions.unshift(current);
    current = guaranteeNonNullable(current.parameters[0]);
  }
  return functions;
}

function _functionIndex(query: V1_ValueSpecification, name: string) {
  return _functions(query).findIndex((func) =>
    matchFunctionName(func.function, name),
  );
}

const _shortName = (functionName: string) =>
  functionName.includes('::')
    ? functionName.substring(functionName.lastIndexOf('::') + 2)
    : functionName;

/**
 * Renders the subset of Pure used by aggregate columns, e.g.
 * rowMapper($x.Price, $x.Qty) or $x->wavg()
 */
function _render(value: V1_ValueSpecification | undefined): string {
  if (value instanceof V1_Lambda) {
    return value.body.map(_render).join('');
  } else if (value instanceof V1_AppliedProperty) {
    return `$x.${value.property}`;
  } else if (value instanceof V1_Variable) {
    return `$${value.name}`;
  } else if (value instanceof V1_AppliedFunction) {
    const name = _shortName(value.function);
    const [first, ...rest] = value.parameters;
    return first instanceof V1_Variable
      ? `${_render(first)}->${name}(${rest.map(_render).join(', ')})`
      : `${name}(${value.parameters.map(_render).join(', ')})`;
  }
  throw new Error(`Can't render value specification`);
}

const _renderColSpec = (colSpec: V1_ColSpec) =>
  `${colSpec.name} : ${_render(colSpec.function1)} : ${_render(colSpec.function2)}`;

function _groupBy(query: V1_ValueSpecification) {
  const groupBy = guaranteeNonNullable(
    _functions(query).find((func) =>
      matchFunctionName(func.function, DataCubeFunction.GROUP_BY),
    ),
    `Expected query to have groupBy()`,
  );
  return {
    // NOTE: parameter at index 0 is the input relation
    columns: _colSpecArrayParam(groupBy, 1).colSpecs.map((col) => col.name),
    aggregations: _colSpecArrayParam(groupBy, 2).colSpecs.map(_renderColSpec),
  };
}

// --------------------------------- TESTS ---------------------------------

describe(unitTest('Grid query: drilldown'), () => {
  // NOTE: an aggregation referencing another column, i.e. weighted average, must be
  // preserved when groupBy() is rebuilt for the drilldown level
  const snapshot = _snapshot(
    [
      {
        name: 'Desk',
        type: PRIMITIVE_TYPE.STRING,
        kind: DataCubeColumnKind.DIMENSION,
        aggregateOperator: DataCubeQueryAggregateOperator.UNIQUE,
      },
      {
        name: 'Book',
        type: PRIMITIVE_TYPE.STRING,
        kind: DataCubeColumnKind.DIMENSION,
        aggregateOperator: DataCubeQueryAggregateOperator.UNIQUE,
      },
      {
        name: 'Price',
        type: PRIMITIVE_TYPE.FLOAT,
        kind: DataCubeColumnKind.MEASURE,
        aggregateOperator: DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
        aggregationParameters: [
          { type: DataCubeOperationAdvancedValueType.COLUMN, value: 'Qty' },
        ],
      },
      {
        name: 'Qty',
        type: PRIMITIVE_TYPE.INTEGER,
        kind: DataCubeColumnKind.MEASURE,
        aggregateOperator: DataCubeQueryAggregateOperator.SUM,
      },
    ],
    ['Desk', 'Book'],
  );

  test('top level is grouped by the first group column only', () => {
    const groupBy = _groupBy(_buildQuery(snapshot, []));
    expect(groupBy.columns).toEqual(['Desk']);
    // columns grouped at deeper levels are aggregated at this level
    expect(groupBy.aggregations).toContain(
      'Book : $x.Book : $x->uniqueValueOnly()',
    );
    expect(groupBy.aggregations).toContain(
      'Price : rowMapper($x.Price, $x.Qty) : $x->wavg()',
    );
    expect(groupBy.aggregations).toContain('Qty : $x.Qty : $x->sum()');
  });

  test('each level is aggregated from the rows of the expanded group', () => {
    const query = _buildQuery(snapshot, ['Rates']);
    const filterIdx = _functionIndex(query, DataCubeFunction.FILTER);
    // rows are filtered down to the expanded group, then aggregated again,
    // rather than aggregating the aggregated values of the level above
    expect(filterIdx).not.toBe(-1);
    expect(filterIdx).toBeLessThan(
      _functionIndex(query, DataCubeFunction.GROUP_BY),
    );
    const groupBy = _groupBy(query);
    expect(groupBy.columns).toEqual(['Desk', 'Book']);
    expect(groupBy.aggregations).toContain(
      'Price : rowMapper($x.Price, $x.Qty) : $x->wavg()',
    );
  });

  test('leaf rows are filtered down to the expanded group and not aggregated', () => {
    const query = _buildQuery(snapshot, ['Rates', 'Book 1']);
    expect(_functionIndex(query, DataCubeFunction.FILTER)).not.toBe(-1);
    expect(_functionIndex(query, DataCubeFunction.GROUP_BY)).toBe(-1);
  });
});

describe(unitTest('Grid query: aggregation after horizontal pivot'), () => {
  const DESK = {
    name: 'Desk',
    type: PRIMITIVE_TYPE.STRING,
    kind: DataCubeColumnKind.DIMENSION,
    aggregateOperator: DataCubeQueryAggregateOperator.UNIQUE,
  };
  const BOOK = { ...DESK, name: 'Book' };
  const YEAR = { ...DESK, name: 'Year' };
  const QTY = {
    name: 'Qty',
    type: PRIMITIVE_TYPE.INTEGER,
    kind: DataCubeColumnKind.MEASURE,
    aggregateOperator: DataCubeQueryAggregateOperator.SUM,
  };
  const _price = (
    aggregateOperator: string,
    aggregationParameters?: DataCubeOperationValue[],
  ) => ({
    name: 'Price',
    type: PRIMITIVE_TYPE.FLOAT,
    kind: DataCubeColumnKind.MEASURE,
    aggregateOperator,
    aggregationParameters,
  });
  const WEIGHTED_BY_QTY = [
    { type: DataCubeOperationAdvancedValueType.COLUMN, value: 'Qty' },
  ];

  // NOTE: pivot() groups by Desk and Book, so the top level, i.e. grouped by Desk,
  // aggregates the aggregated values of pivot() rows
  function _topLevelPivotResultAggregations(columns: TestColumn[]) {
    const snapshot = _snapshot(columns, ['Desk', 'Book'], {
      columns: ['Year'],
      castColumns: [
        { name: 'Desk', type: PRIMITIVE_TYPE.STRING },
        { name: 'Book', type: PRIMITIVE_TYPE.STRING },
        { name: '2024__|__Price', type: PRIMITIVE_TYPE.FLOAT },
        { name: '2024__|__Qty', type: PRIMITIVE_TYPE.INTEGER },
      ],
    });
    return _groupBy(_buildQuery(snapshot, [])).aggregations.filter(
      (aggregation) => aggregation.startsWith('2024__|__'),
    );
  }

  test('aggregations which do not support reaggregation only show the value all rows agree on', () => {
    expect(
      _topLevelPivotResultAggregations([
        DESK,
        BOOK,
        YEAR,
        _price(DataCubeQueryAggregateOperator.MEDIAN),
        QTY,
      ]),
    ).toEqual([
      '2024__|__Price : $x.2024__|__Price : $x->uniqueValueOnly()',
      '2024__|__Qty : $x.2024__|__Qty : $x->sum()',
      // the row count added by the grid
      '2024__|__count : $x.2024__|__count : $x->sum()',
    ]);
  });

  test('weighted average weighted by a summed column is aggregated again', () => {
    expect(
      _topLevelPivotResultAggregations([
        DESK,
        BOOK,
        YEAR,
        _price(
          DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
          WEIGHTED_BY_QTY,
        ),
        QTY,
      ]),
    ).toContain(
      '2024__|__Price : rowMapper($x.2024__|__Price, $x.2024__|__Qty) : $x->wavg()',
    );
  });

  test('weighted average weighted by a column which is not summed only shows the value all rows agree on', () => {
    expect(
      _topLevelPivotResultAggregations([
        DESK,
        BOOK,
        YEAR,
        _price(
          DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
          WEIGHTED_BY_QTY,
        ),
        { ...QTY, aggregateOperator: DataCubeQueryAggregateOperator.AVERAGE },
      ]),
    ).toContain('2024__|__Price : $x.2024__|__Price : $x->uniqueValueOnly()');
  });

  test('long-standing aggregations, e.g. average, are aggregated again as before', () => {
    expect(
      _topLevelPivotResultAggregations([
        DESK,
        BOOK,
        YEAR,
        _price(DataCubeQueryAggregateOperator.AVERAGE),
        QTY,
      ]),
    ).toContain('2024__|__Price : $x.2024__|__Price : $x->average()');
  });

  test('without horizontal pivot, aggregations are computed over the underlying rows', () => {
    const snapshot = _snapshot(
      [DESK, BOOK, _price(DataCubeQueryAggregateOperator.MEDIAN), QTY],
      ['Desk', 'Book'],
    );
    expect(_groupBy(_buildQuery(snapshot, [])).aggregations).toContain(
      'Price : $x.Price : $x->median()',
    );
  });
});
