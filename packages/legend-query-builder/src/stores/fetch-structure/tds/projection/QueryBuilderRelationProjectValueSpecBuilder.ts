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
  ColSpecArray,
  type ValueSpecification,
  extractElementNameFromPath,
  SimpleFunctionExpression,
  ColSpecArrayInstance,
  Multiplicity,
  ColSpec,
  INTERNAL__UnknownValueSpecification,
  V1_serializeRawValueSpecification,
  V1_transformRawLambda,
  V1_GraphTransformerContextBuilder,
  GenericType,
  GenericTypeExplicitReference,
  Relation,
  RelationColumn,
  RelationType,
} from '@finos/legend-graph';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import {
  buildPropertyExpressionChain,
  type LambdaFunctionBuilderOption,
} from '../../../QueryBuilderValueSpecificationBuilderHelper.js';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';

export const buildRelationProjection = (
  precedingExpression: ValueSpecification,
  tdsState: QueryBuilderTDSState,
  options?: LambdaFunctionBuilderOption,
): SimpleFunctionExpression => {
  const projectFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT,
    ),
  );
  const queryBuilderState = tdsState.queryBuilderState;

  const instanceVal = new ColSpecArrayInstance(Multiplicity.ONE, undefined);

  const colSepcArray = new ColSpecArray();
  instanceVal.values = [colSepcArray];
  const relationType = new RelationType(RelationType.ID);

  tdsState.projectionColumns.forEach((projectionColumnState) => {
    const colSpec = new ColSpec();
    colSepcArray.colSpecs.push(colSpec);
    colSpec.name = projectionColumnState.columnName;
    // column projection
    let columnLambda: ValueSpecification;
    if (
      projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
    ) {
      columnLambda = buildGenericLambdaFunctionInstanceValue(
        projectionColumnState.lambdaParameterName,
        [
          buildPropertyExpressionChain(
            projectionColumnState.propertyExpressionState.propertyExpression,
            projectionColumnState.propertyExpressionState.queryBuilderState,
            projectionColumnState.lambdaParameterName,
            options,
          ),
        ],
        queryBuilderState.graphManagerState.graph,
      );
    } else if (
      projectionColumnState instanceof
      QueryBuilderDerivationProjectionColumnState
    ) {
      columnLambda = new INTERNAL__UnknownValueSpecification(
        V1_serializeRawValueSpecification(
          V1_transformRawLambda(
            projectionColumnState.lambda,
            new V1_GraphTransformerContextBuilder(
              // TODO?: do we need to include the plugins here?
              [],
            )
              .withKeepSourceInformationFlag(
                Boolean(options?.keepSourceInformation),
              )
              .build(),
          ),
        ),
      );
    } else {
      throw new UnsupportedOperationError(
        `Can't build relation project() column expression: unsupported projection column state`,
        projectionColumnState,
      );
    }
    colSpec.function1 = columnLambda;
    const returnType = guaranteeNonNullable(
      projectionColumnState.getColumnType(),
      `Can't create value spec for projection column ${projectionColumnState.columnName}`,
    );
    relationType.columns.push(
      new RelationColumn(
        projectionColumnState.columnName,
        GenericTypeExplicitReference.create(new GenericType(returnType)),
      ),
    );
  });
  projectFunction.parametersValues = [precedingExpression, instanceVal];
  const relationGenericType = new GenericType(Relation.INSTANCE);
  const relationTypeGenericType = new GenericType(relationType);
  relationGenericType.typeArguments = [
    GenericTypeExplicitReference.create(relationTypeGenericType),
  ];
  projectFunction.genericType =
    GenericTypeExplicitReference.create(relationGenericType);
  return projectFunction;
};
