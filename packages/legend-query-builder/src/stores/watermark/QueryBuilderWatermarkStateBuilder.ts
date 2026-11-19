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

import {
  type LambdaFunction,
  type ValueSpecification,
  CollectionInstanceValue,
  EnumValueInstanceValue,
  PrimitiveInstanceValue,
  PrimitiveType,
  SimpleFunctionExpression,
  VariableExpression,
  matchFunctionName,
} from '@finos/legend-graph';
import {
  assertTrue,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  DATA_DNS_ENV,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
} from '../../graph/QueryBuilderMetaModelConst.js';
import {
  QueryBuilderDataDNSWatermark,
  QueryBuilderStandardWatermark,
} from './QueryBuilderWatermarkState.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { QueryBuilderValueSpecificationProcessor } from '../QueryBuilderStateBuilder.js';

const extractStringLiteral = (
  value: ValueSpecification | undefined,
  description: string,
): string => {
  const instance = guaranteeType(
    value,
    PrimitiveInstanceValue,
    `Can't process forDataDNSWatermark() expression: ${description} must be a string literal`,
  );
  return String(guaranteeNonNullable(instance.values[0]));
};

const processDataDNSWatermarkExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  const envValue = guaranteeType(
    expression.parametersValues[1],
    EnumValueInstanceValue,
    `Can't process forDataDNSWatermark() expression: environment must be a DataDNSEnv enum value`,
  );
  const envName = guaranteeNonNullable(envValue.values[0]).value.name;
  const env = Object.values(DATA_DNS_ENV).find((e) => e === envName);
  if (!env) {
    throw new UnsupportedOperationError(
      `Can't process forDataDNSWatermark() expression: unsupported environment '${envName}'`,
    );
  }
  const dataDNSWatermark = new QueryBuilderDataDNSWatermark();
  dataDNSWatermark.setEnv(env);
  dataDNSWatermark.setRegistryUri(
    extractStringLiteral(expression.parametersValues[2], 'registry URI'),
  );
  // the date is either the business date parameter of the query, or a date of its own
  const dateValue = expression.parametersValues[3];
  if (dateValue instanceof VariableExpression) {
    assertTrue(
      dateValue.name ===
        queryBuilderState.watermarkState.businessDateVariable?.name,
      `Can't process forDataDNSWatermark() expression: date must be the business date parameter or a date`,
    );
    dataDNSWatermark.setDate(dateValue);
  } else {
    const date = guaranteeType(
      dateValue,
      PrimitiveInstanceValue,
      `Can't process forDataDNSWatermark() expression: date must be the business date parameter or a date`,
    );
    assertTrue(
      (
        [
          PrimitiveType.STRICTDATE,
          PrimitiveType.DATE,
          PrimitiveType.DATETIME,
        ] as unknown[]
      ).includes(date.genericType.value.rawType),
      `Can't process forDataDNSWatermark() expression: date must be a date`,
    );
    dataDNSWatermark.setDate(date);
  }
  const milestone = expression.parametersValues[4];
  if (
    !(milestone instanceof CollectionInstanceValue) ||
    milestone.values.length > 0
  ) {
    dataDNSWatermark.setMilestone(extractStringLiteral(milestone, 'milestone'));
  }
  queryBuilderState.watermarkState.setWatermark(dataDNSWatermark);
};

export const processWatermarkExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process ${expression.functionName}() expression: only support ${expression.functionName}() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
    ]),
    `Can't process ${expression.functionName}() expression: only support ${expression.functionName}() immediately following getAll()`,
  );

  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  if (
    matchFunctionName(
      expression.functionName,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.DATA_DNS_WATERMARK,
    )
  ) {
    processDataDNSWatermarkExpression(expression, queryBuilderState);
    return;
  }

  const watermarkValue = expression.parametersValues[1];
  queryBuilderState.watermarkState.setWatermark(
    new QueryBuilderStandardWatermark(
      guaranteeNonNullable(
        watermarkValue,
        `Can't process forWatermark() expression: watermark value is missing`,
      ),
    ),
  );
};
