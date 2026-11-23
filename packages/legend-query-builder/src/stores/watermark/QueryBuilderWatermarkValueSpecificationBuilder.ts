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
  CollectionInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PrimitiveInstanceValue,
  PrimitiveType,
  SimpleFunctionExpression,
  VariableExpression,
  extractElementNameFromPath,
  type LambdaFunction,
  type ValueSpecification,
} from '@finos/legend-graph';
import {
  assertTrue,
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  DATA_DNS_ENV_ENUMERATION_PATH,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
} from '../../graph/QueryBuilderMetaModelConst.js';
import { buildEnumInstanceValue } from '../shared/ValueSpecificationEditorHelper.js';
import {
  type QueryBuilderWatermarkState,
  QueryBuilderDataDNSWatermark,
  QueryBuilderStandardWatermark,
} from './QueryBuilderWatermarkState.js';

const buildStringValue = (value: string): PrimitiveInstanceValue => {
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
  );
  instance.values = [value];
  return instance;
};

const buildDataDNSWatermarkExpression = (
  watermarkState: QueryBuilderWatermarkState,
  dataDNSWatermark: QueryBuilderDataDNSWatermark,
  currentExpression: ValueSpecification,
): SimpleFunctionExpression => {
  const expression = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.DATA_DNS_WATERMARK,
    ),
  );
  const date = guaranteeNonNullable(
    dataDNSWatermark.date,
    `Can't build forDataDNSWatermark() expression: the date is missing`,
  );
  // the parser only accepts the business date parameter of the query as a parameter date
  if (date instanceof VariableExpression) {
    assertTrue(
      date.name === watermarkState.businessDateVariable?.name,
      `Can't build forDataDNSWatermark() expression: the date parameter '${date.name}' is not the business date of the query`,
    );
  }
  const milestone = dataDNSWatermark.milestone
    ? buildStringValue(dataDNSWatermark.milestone)
    : new CollectionInstanceValue(Multiplicity.ZERO);
  expression.parametersValues = [
    currentExpression,
    buildEnumInstanceValue(
      watermarkState.queryBuilderState.graphManagerState.graph,
      DATA_DNS_ENV_ENUMERATION_PATH,
      dataDNSWatermark.env,
      watermarkState.queryBuilderState.observerContext,
    ),
    buildStringValue(dataDNSWatermark.registryUri),
    date,
    milestone,
  ];
  return expression;
};

const buildStandardWatermarkExpression = (
  watermark: QueryBuilderStandardWatermark,
  currentExpression: ValueSpecification,
): SimpleFunctionExpression => {
  const watermarkExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.WATERMARK),
  );
  watermarkExpression.parametersValues = [currentExpression, watermark.value];
  return watermarkExpression;
};

export const buildWatermarkExpression = (
  watermarkState: QueryBuilderWatermarkState,
  lambdaFunction: LambdaFunction,
): void => {
  const watermark = watermarkState.watermark;
  if (!watermark) {
    return;
  }
  const currentExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
  );
  // replace watermark as main expression
  if (watermark instanceof QueryBuilderDataDNSWatermark) {
    lambdaFunction.expressionSequence[0] = buildDataDNSWatermarkExpression(
      watermarkState,
      watermark,
      currentExpression,
    );
  } else if (watermark instanceof QueryBuilderStandardWatermark) {
    lambdaFunction.expressionSequence[0] = buildStandardWatermarkExpression(
      watermark,
      currentExpression,
    );
  } else {
    throw new UnsupportedOperationError(`Can't build watermark expression`);
  }
};
