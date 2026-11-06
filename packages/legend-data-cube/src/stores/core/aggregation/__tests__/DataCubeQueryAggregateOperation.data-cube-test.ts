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
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_Lambda,
  type V1_ColSpec,
} from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { TEST__DataCubeEngine } from '../../../__tests__/DataCubeTestUtils.js';
import {
  DataCubeFunction,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryAggregateOperator,
  type DataCubeOperationValue,
} from '../../DataCubeQueryEngine.js';
import { DataCubeColumnConfiguration } from '../../model/DataCubeConfiguration.js';
import type { DataCubeColumn } from '../../model/DataCubeColumn.js';
import {
  _aggCol,
  _validateGroupBy,
} from '../../DataCubeSnapshotBuilderUtils.js';
import type { DataCubeSnapshotAggregateColumn } from '../../DataCubeSnapshot.js';

const COLUMNS: DataCubeColumn[] = [
  { name: 'str', type: PRIMITIVE_TYPE.STRING },
  { name: 'float', type: PRIMITIVE_TYPE.FLOAT },
  { name: 'int', type: PRIMITIVE_TYPE.INTEGER },
  { name: 'decimal', type: PRIMITIVE_TYPE.DECIMAL },
  { name: 'date', type: PRIMITIVE_TYPE.STRICTDATE },
  { name: 'bool', type: PRIMITIVE_TYPE.BOOLEAN },
];

const _getCol = (name: string) =>
  guaranteeNonNullable(
    COLUMNS.find((column) => column.name === name),
    `Can't find column '${name}'`,
  );

const _columnParameter = (name: string): DataCubeOperationValue => ({
  type: DataCubeOperationAdvancedValueType.COLUMN,
  value: name,
});

function _columnConfiguration(
  column: DataCubeColumn,
  operator: string,
  parameterValues: DataCubeOperationValue[],
) {
  const configuration = new DataCubeColumnConfiguration(
    column.name,
    column.type,
  );
  configuration.aggregateOperator = operator;
  configuration.aggregationParameters = parameterValues;
  return configuration;
}

function _mapperBody(colSpec: V1_ColSpec) {
  return guaranteeType(colSpec.function1, V1_Lambda).body[0];
}

describe(unitTest('Aggregation: build and process aggregate columns'), () => {
  const engine = new TEST__DataCubeEngine();

  test.each([
    [DataCubeQueryAggregateOperator.MEDIAN, 'int', []],
    [DataCubeQueryAggregateOperator.MODE, 'float', []],
    [
      DataCubeQueryAggregateOperator.PERCENTILE,
      'float',
      [{ type: PRIMITIVE_TYPE.FLOAT, value: 0.9 }],
    ],
    [
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
      'float',
      [_columnParameter('int')],
    ],
    [
      DataCubeQueryAggregateOperator.CORRELATION,
      'float',
      [_columnParameter('int')],
    ],
    [
      DataCubeQueryAggregateOperator.COVARIANCE_POPULATION,
      'float',
      [_columnParameter('int')],
    ],
    [
      DataCubeQueryAggregateOperator.COVARIANCE_SAMPLE,
      'float',
      [_columnParameter('int')],
    ],
    [DataCubeQueryAggregateOperator.MAX_BY, 'str', [_columnParameter('float')]],
    [DataCubeQueryAggregateOperator.MIN_BY, 'date', [_columnParameter('int')]],
    [DataCubeQueryAggregateOperator.ALL, 'bool', []],
    [DataCubeQueryAggregateOperator.ANY, 'bool', []],
  ] as [string, string, DataCubeOperationValue[]][])(
    `%s`,
    (operator, columnName, parameterValues) => {
      const column = _getCol(columnName);
      const colSpec = guaranteeNonNullable(
        engine
          .getAggregateOperation(operator)
          .buildAggregateColumnExpression(
            _columnConfiguration(column, operator, parameterValues),
          ),
      );

      // processing the aggregate column must resolve to the same operation (i.e. none of
      // the other operations would claim it first) with the same parameter values
      const aggCol = _aggCol(colSpec, _getCol, engine.aggregateOperations);
      expect(aggCol.name).toBe(column.name);
      expect(aggCol.operator).toBe(operator);
      expect(aggCol.parameterValues).toEqual(parameterValues);
    },
  );

  test('two-column aggregation pairs up values using rowMapper()', () => {
    const colSpec = guaranteeNonNullable(
      engine
        .getAggregateOperation(DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE)
        .buildAggregateColumnExpression(
          _columnConfiguration(
            _getCol('float'),
            DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
            [_columnParameter('int')],
          ),
        ),
    );
    const mapper = guaranteeType(_mapperBody(colSpec), V1_AppliedFunction);
    expect(mapper.function).toBe(DataCubeFunction.ROW_MAPPER);
    expect(
      mapper.parameters.map(
        (param) => guaranteeType(param, V1_AppliedProperty).property,
      ),
    ).toEqual(['float', 'int']);
  });

  test('two-column aggregation requires the other column', () => {
    expect(() =>
      engine
        .getAggregateOperation(DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE)
        .buildAggregateColumnExpression(
          _columnConfiguration(
            _getCol('float'),
            DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
            [],
          ),
        ),
    ).toThrow(
      `Can't build aggregate column 'float': aggregation 'weighted average' requires another column (weight)`,
    );
  });
});

describe(unitTest('Aggregation: compatibility'), () => {
  const engine = new TEST__DataCubeEngine();

  test('mode() is only available for integer and float columns', () => {
    const operation = engine.getAggregateOperation(
      DataCubeQueryAggregateOperator.MODE,
    );
    expect(operation.isCompatibleWithColumn(_getCol('int'))).toBe(true);
    expect(operation.isCompatibleWithColumn(_getCol('float'))).toBe(true);
    expect(operation.isCompatibleWithColumn(_getCol('decimal'))).toBe(false);
    expect(operation.isCompatibleWithColumn(_getCol('str'))).toBe(false);
  });

  test('percentile() requires a float value between 0 and 1', () => {
    const operation = engine.getAggregateOperation(
      DataCubeQueryAggregateOperator.PERCENTILE,
    );
    expect(
      operation.isCompatibleWithParameterValues(
        operation.generateDefaultParameterValues(_getCol('float')),
      ),
    ).toBe(true);
    expect(
      operation.isCompatibleWithParameterValues([
        { type: PRIMITIVE_TYPE.FLOAT, value: 1 },
      ]),
    ).toBe(true);
    expect(
      operation.isCompatibleWithParameterValues([
        { type: PRIMITIVE_TYPE.FLOAT, value: 1.5 },
      ]),
    ).toBe(false);
    expect(
      operation.isCompatibleWithParameterValues([
        { type: PRIMITIVE_TYPE.INTEGER, value: 1 },
      ]),
    ).toBe(false);
    expect(operation.isCompatibleWithParameterValues([])).toBe(false);
  });

  test('two-column aggregation picks another numeric column by default', () => {
    const operation = engine.getAggregateOperation(
      DataCubeQueryAggregateOperator.MAX_BY,
    );
    expect(
      operation.generateDefaultParameterValues(_getCol('str'), [
        _getCol('str'),
        _getCol('date'),
        _getCol('int'),
        _getCol('float'),
      ]),
    ).toEqual([_columnParameter('int')]);
    // the aggregated column itself is not used as the other column
    expect(
      operation.generateDefaultParameterValues(_getCol('int'), [
        _getCol('int'),
        _getCol('float'),
      ]),
    ).toEqual([_columnParameter('float')]);
  });

  test('two-column aggregation is not available without another numeric column', () => {
    const operation = engine.getAggregateOperation(
      DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
    );
    const parameterValues = operation.generateDefaultParameterValues(
      _getCol('float'),
      [_getCol('float'), _getCol('str')],
    );
    expect(parameterValues).toEqual([]);
    expect(operation.isCompatibleWithParameterValues(parameterValues)).toBe(
      false,
    );
  });
});

describe(unitTest('Aggregation: reaggregation after horizontal pivot'), () => {
  const engine = new TEST__DataCubeEngine();
  const _supportsReaggregation = (
    operator: string,
    parameterValues: DataCubeOperationValue[] = [],
    weightOperator?: string,
  ) =>
    engine
      .getAggregateOperation(operator)
      .supportsReaggregation(parameterValues, (colName) =>
        colName === 'Qty' ? weightOperator : undefined,
      );

  test.each([
    DataCubeQueryAggregateOperator.SUM,
    DataCubeQueryAggregateOperator.MIN,
    DataCubeQueryAggregateOperator.MAX,
    DataCubeQueryAggregateOperator.ALL,
    DataCubeQueryAggregateOperator.ANY,
    // kept as is to not change the values of existing data cubes
    DataCubeQueryAggregateOperator.AVERAGE,
    DataCubeQueryAggregateOperator.COUNT,
  ])('%s is aggregated again', (operator) => {
    expect(_supportsReaggregation(operator)).toBe(true);
  });

  test.each([
    [DataCubeQueryAggregateOperator.MEDIAN, []],
    [DataCubeQueryAggregateOperator.MODE, []],
    [
      DataCubeQueryAggregateOperator.PERCENTILE,
      [{ type: PRIMITIVE_TYPE.FLOAT, value: 0.9 }],
    ],
    [DataCubeQueryAggregateOperator.CORRELATION, [_columnParameter('Qty')]],
    [
      DataCubeQueryAggregateOperator.COVARIANCE_POPULATION,
      [_columnParameter('Qty')],
    ],
    [
      DataCubeQueryAggregateOperator.COVARIANCE_SAMPLE,
      [_columnParameter('Qty')],
    ],
    [DataCubeQueryAggregateOperator.MAX_BY, [_columnParameter('Qty')]],
    [DataCubeQueryAggregateOperator.MIN_BY, [_columnParameter('Qty')]],
  ])('%s is not aggregated again', (operator, parameterValues) => {
    expect(
      _supportsReaggregation(
        operator,
        parameterValues,
        DataCubeQueryAggregateOperator.SUM,
      ),
    ).toBe(false);
  });

  test('weighted average is aggregated again only when its weights are summed', () => {
    const weightedByQty = [_columnParameter('Qty')];
    expect(
      _supportsReaggregation(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
        weightedByQty,
        DataCubeQueryAggregateOperator.SUM,
      ),
    ).toBe(true);
    expect(
      _supportsReaggregation(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
        weightedByQty,
        DataCubeQueryAggregateOperator.AVERAGE,
      ),
    ).toBe(false);
    // e.g. the weights are excluded from pivot, so not aggregated by pivot()
    expect(
      _supportsReaggregation(
        DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE,
        weightedByQty,
      ),
    ).toBe(false);
  });

  // pivot(~[Year], ~[Price : ...]) then groupBy(~[Desk], ~['2024__|__Price' : ...])
  function _validate(pivotOperator: string, groupByOperator: string) {
    const _aggregateColumn = (
      name: string,
      operator: string,
    ): DataCubeSnapshotAggregateColumn => ({
      name,
      type: PRIMITIVE_TYPE.FLOAT,
      operator,
      parameterValues: [],
    });
    _validateGroupBy(
      { columns: [{ name: 'Desk', type: PRIMITIVE_TYPE.STRING }] },
      [_aggregateColumn('2024__|__Price', groupByOperator)],
      {
        columns: [{ name: 'Year', type: PRIMITIVE_TYPE.STRING }],
        castColumns: [],
      },
      [_aggregateColumn('Price', pivotOperator)],
      [],
      engine.aggregateOperations,
    );
  }

  test('groupBy() may only show the value all rows agree on for aggregations which are not aggregated again', () => {
    expect(() =>
      _validate(
        DataCubeQueryAggregateOperator.MEDIAN,
        DataCubeQueryAggregateOperator.UNIQUE,
      ),
    ).not.toThrow();
    expect(() =>
      _validate(
        DataCubeQueryAggregateOperator.SUM,
        DataCubeQueryAggregateOperator.UNIQUE,
      ),
    ).toThrow(
      `Can't process groupBy() expression: found conflicting aggregation specification for column 'Price'`,
    );
  });
});
