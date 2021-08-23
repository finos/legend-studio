/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type {
  AbstractPropertyExpression,
  Class,
  PureModel,
} from '@finos/legend-graph';
import {
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  CollectionInstanceValue,
  CORE_ELEMENT_PATH,
  extractElementNameFromPath,
  FunctionType,
  LambdaFunction,
  Multiplicity,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  SUPPORTED_FUNCTIONS,
} from '../QueryBuilder_Const';
import { QueryBuilderAggregateOperator_Average } from './aggregateOperators/QueryBuilderAggregateOperator_Average';
import { QueryBuilderAggregateOperator_Count } from './aggregateOperators/QueryBuilderAggregateOperator_Count';
import { QueryBuilderAggregateOperator_DistinctCount } from './aggregateOperators/QueryBuilderAggregateOperator_DistinctCount';
import { QueryBuilderAggregateOperator_Max } from './aggregateOperators/QueryBuilderAggregateOperator_Max';
import { QueryBuilderAggregateOperator_Min } from './aggregateOperators/QueryBuilderAggregateOperator_Min';
import { QueryBuilderAggregateOperator_StdDev_Population } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Population';
import { QueryBuilderAggregateOperator_StdDev_Sample } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Sample';
import { QueryBuilderAggregateOperator_Sum } from './aggregateOperators/QueryBuilderAggregateOperator_Sum';
import type { QueryBuilderAggregateOperator } from './QueryBuilderAggregationState';
import { buildGetAllFunction } from './QueryBuilderLambdaBuilder';
import { buildGenericLambdaFunctionInstanceValue } from './QueryBuilderValueSpecificationBuilderHelper';

const buildGroupByFunction = (
  getAllFunction: SimpleFunctionExpression,
  propertyExpression: AbstractPropertyExpression,
  aggregates: [QueryBuilderAggregateOperator, string][],
  includePropertyValue: boolean,
  graph: PureModel,
): SimpleFunctionExpression => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const typeAny = graph.getType(CORE_ELEMENT_PATH.ANY);
  const typeString = graph.getPrimitiveType(PRIMITIVE_TYPE.STRING);
  const lambdaFunction = new LambdaFunction(
    new FunctionType(typeAny, multiplicityOne),
  );

  const groupByFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(SUPPORTED_FUNCTIONS.TDS_GROUP_BY),
    multiplicityOne,
  );

  const colLambdas = new CollectionInstanceValue(
    graph.getTypicalMultiplicity(
      includePropertyValue
        ? TYPICAL_MULTIPLICITY_TYPE.ONE
        : TYPICAL_MULTIPLICITY_TYPE.ZERO,
    ),
  );
  const aggregateLambdas = new CollectionInstanceValue(
    new Multiplicity(aggregates.length, aggregates.length),
  );
  const noOfCols = aggregates.length + (includePropertyValue ? 1 : 0);
  const colAliases = new CollectionInstanceValue(
    new Multiplicity(noOfCols, noOfCols),
  );

  if (includePropertyValue) {
    colLambdas.values.push(
      buildGenericLambdaFunctionInstanceValue(
        DEFAULT_LAMBDA_VARIABLE_NAME,
        [propertyExpression],
        graph,
      ),
    );
    const valueColAlias = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(typeString)),
      multiplicityOne,
    );
    valueColAlias.values.push('Value');
    colAliases.values.push(valueColAlias);
  }

  aggregates.forEach((pair) => {
    const aggregateFunctionExpression = new SimpleFunctionExpression(
      extractElementNameFromPath(SUPPORTED_FUNCTIONS.TDS_AGG),
      multiplicityOne,
    );
    aggregateFunctionExpression.parametersValues = [
      buildGenericLambdaFunctionInstanceValue(
        DEFAULT_LAMBDA_VARIABLE_NAME,
        [propertyExpression],
        graph,
      ),
      buildGenericLambdaFunctionInstanceValue(
        DEFAULT_LAMBDA_VARIABLE_NAME,
        [
          pair[0].buildAggregateExpression(
            propertyExpression,
            DEFAULT_LAMBDA_VARIABLE_NAME,
            graph,
          ),
        ],
        graph,
      ),
    ];
    aggregateLambdas.values.push(aggregateFunctionExpression);

    const colAlias = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(typeString)),
      multiplicityOne,
    );
    colAlias.values.push(pair[1]);
    colAliases.values.push(colAlias);
  });
  groupByFunction.parametersValues = [
    getAllFunction,
    colLambdas,
    aggregateLambdas,
    colAliases,
  ];
  lambdaFunction.expressionSequence[0] = groupByFunction;
  return groupByFunction;
};

export const buildNumericPreviewDataQuery = (
  propertyExpression: AbstractPropertyExpression,
  _class: Class,
  graph: PureModel,
): LambdaFunction => {
  // Build the following query
  //
  // ClassX.all()->groupBy(
  //   [],
  //   [
  //     agg(x|$x.prop, x|$x->count()),
  //     agg(x|$x.prop, x|$x->distinct()->count()),
  //     agg(x|$x.prop, x|$x->sum()),
  //     agg(x|$x.prop, x|$x->min()),
  //     agg(x|$x.prop, x|$x->max()),
  //     agg(x|$x.prop, x|$x->average()),
  //     agg(x|$x.prop, x|$x->stdDevPopulation()),
  //     agg(x|$x.prop, x|$x->stdDevSample())
  //   ],
  //   [
  //     'Count',
  //     'Distinct Count',
  //     'Sum',
  //     'Min',
  //     'Max',
  //     'Average',
  //     'Std Dev (Population)',
  //     'Std Dev (Sample)'
  //   ]
  // )
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const typeAny = graph.getType(CORE_ELEMENT_PATH.ANY);
  const lambdaFunction = new LambdaFunction(
    new FunctionType(typeAny, multiplicityOne),
  );
  const groupByFunction = buildGroupByFunction(
    buildGetAllFunction(_class, multiplicityOne),
    propertyExpression,
    [
      [new QueryBuilderAggregateOperator_Count(), 'Count'],
      [new QueryBuilderAggregateOperator_DistinctCount(), 'Distinct Count'],
      [new QueryBuilderAggregateOperator_Sum(), 'Sum'],
      [new QueryBuilderAggregateOperator_Min(), 'Min'],
      [new QueryBuilderAggregateOperator_Max(), 'Max'],
      [new QueryBuilderAggregateOperator_Average(), 'Average'],
      [
        new QueryBuilderAggregateOperator_StdDev_Population(),
        'Standard Deviation (Population)',
      ],
      [
        new QueryBuilderAggregateOperator_StdDev_Sample(),
        'Standard Deviation (Sample)',
      ],
    ] as [QueryBuilderAggregateOperator, string][],
    false,
    graph,
  );
  lambdaFunction.expressionSequence[0] = groupByFunction;
  return lambdaFunction;
};

export const buildNonNumericPreviewDataQuery = (
  propertyExpression: AbstractPropertyExpression,
  _class: Class,
  graph: PureModel,
): LambdaFunction => {
  // Build the following query
  //
  // ClassX.all()->groupBy(
  //   [
  //     x|$x.prop
  //   ],
  //   [
  //     agg(x|$x.prop, x|$x->distinct()->count())
  //   ],
  //   [
  //     'Value',
  //     'Count'
  //   ]
  // )->take(10)->sort([desc('Count'), asc('Value')])
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const typeAny = graph.getType(CORE_ELEMENT_PATH.ANY);
  const lambdaFunction = new LambdaFunction(
    new FunctionType(typeAny, multiplicityOne),
  );

  // build groupBy()
  const groupByFunction = buildGroupByFunction(
    buildGetAllFunction(_class, multiplicityOne),
    propertyExpression,
    [[new QueryBuilderAggregateOperator_Count(), 'Count']] as [
      QueryBuilderAggregateOperator,
      string,
    ][],
    true,
    graph,
  );
  lambdaFunction.expressionSequence[0] = groupByFunction;

  // build sort()
  const sortFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(SUPPORTED_FUNCTIONS.TDS_SORT),
    multiplicityOne,
  );
  const sortColumnFunctions = new CollectionInstanceValue(
    new Multiplicity(2, 2),
    undefined,
  );
  sortColumnFunctions.values = [
    [SUPPORTED_FUNCTIONS.TDS_DESC, 'Count'],
    [SUPPORTED_FUNCTIONS.TDS_ASC, 'Value'],
  ].map((pair) => {
    const sortColumnFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(pair[0]),
      multiplicityOne,
    );
    const sortColumnName = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.STRING)),
      ),
      multiplicityOne,
    );
    sortColumnName.values = [pair[1]];
    sortColumnFunction.parametersValues[0] = sortColumnName;
    return sortColumnFunction;
  });
  sortFunction.parametersValues[0] = groupByFunction;
  sortFunction.parametersValues[1] = sortColumnFunctions;

  // build take()
  const limit = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.INTEGER)),
    ),
    multiplicityOne,
  );
  limit.values = [10];
  const takeFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(SUPPORTED_FUNCTIONS.TDS_TAKE),
    multiplicityOne,
  );
  takeFunction.parametersValues[0] = sortFunction;
  takeFunction.parametersValues[1] = limit;

  lambdaFunction.expressionSequence[0] = takeFunction;

  return lambdaFunction;
};

export type QueryBuilderPreviewData = {
  columns: string[];
  rows: { values: (string | number)[] }[];
};
