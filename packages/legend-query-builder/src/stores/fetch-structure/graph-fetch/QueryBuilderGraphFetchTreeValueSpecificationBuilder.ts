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
  type ValueSpecification,
  type LambdaFunction,
  type PureModel,
  type RootGraphFetchTree,
  extractElementNameFromPath,
  GenericType,
  GenericTypeExplicitReference,
  matchFunctionName,
  PrimitiveInstanceValue,
  SimpleFunctionExpression,
  GraphFetchTreeInstanceValue,
  PrimitiveType,
  InstanceValue,
  Multiplicity,
  PackageableElementExplicitReference,
  SUPPORTED_FUNCTIONS,
  CollectionInstanceValue,
  KeyExpressionInstanceValue,
  KeyExpression,
} from '@finos/legend-graph';
import {
  UnsupportedOperationError,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import {
  QUERY_BUILDER_PURE_PATH,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
} from '../../../graph/QueryBuilderMetaModelConst.js';
import {
  GraphFetchExternalFormatSerializationState,
  GraphFetchPureSerializationState,
  type QueryBuilderGraphFetchTreeState,
} from './QueryBuilderGraphFetchTreeState.js';
import { isGraphFetchTreeDataEmpty } from './QueryBuilderGraphFetchTreeUtil.js';

const appendTakeLimit = (
  lambda: LambdaFunction,
  previewLimit?: number | undefined,
): LambdaFunction => {
  if (!previewLimit) {
    return lambda;
  }
  if (lambda.expressionSequence.length === 1) {
    const func = lambda.expressionSequence[0];
    if (func instanceof SimpleFunctionExpression) {
      if (
        matchFunctionName(
          func.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE,
        )
      ) {
        const limit = new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.INTEGER),
          ),
        );
        limit.values = [previewLimit];
        const takeFunction = new SimpleFunctionExpression(
          extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TAKE),
        );

        // NOTE: `take()` does not work on `graphFetch()` or `serialize()` so we need to
        // put it next to `all()`
        const serializeFunction = func;
        const graphFetchFunc = guaranteeType(
          serializeFunction.parametersValues[0],
          SimpleFunctionExpression,
        );
        const getAllFunc = graphFetchFunc
          .parametersValues[0] as ValueSpecification;
        takeFunction.parametersValues[0] = getAllFunc;
        takeFunction.parametersValues[1] = limit;
        graphFetchFunc.parametersValues = [
          takeFunction,
          graphFetchFunc.parametersValues[1] as ValueSpecification,
        ];
        return lambda;
      }
    }
  }
  return lambda;
};

export const buildPureSerializationConfig = (
  config: Record<PropertyKey, boolean>,
  graph: PureModel,
): SimpleFunctionExpression => {
  const configClass = graph.getClass(QUERY_BUILDER_PURE_PATH.SERIALIZE_CONFIG);
  const newFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(SUPPORTED_FUNCTIONS.NEW),
  );
  // build instance
  const instance = new InstanceValue(Multiplicity.ONE, undefined);
  instance.values[0] = PackageableElementExplicitReference.create(configClass);
  // build values
  const primitiveInstance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
  );
  primitiveInstance.values = [''];
  const pureConfigCollection = new CollectionInstanceValue(
    Multiplicity.ONE,
    undefined,
  );
  configClass.properties.forEach((classProperty) => {
    const property = Object.getOwnPropertyNames(config).find(
      (p) => p === classProperty.name,
    );
    if (property && config[property] !== undefined) {
      const keyExpressionInstance = new KeyExpressionInstanceValue();
      // key expression
      const keyInstance = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(PrimitiveType.STRING),
        ),
      );
      keyInstance.values = [property];
      // primitive
      const keyPrimitiveInstance = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(classProperty.genericType.value.rawType),
        ),
      );
      keyPrimitiveInstance.values = [config[property]];
      const keyExpression = new KeyExpression(
        keyInstance,
        keyPrimitiveInstance,
        false,
      );
      keyExpressionInstance.values = [keyExpression];
      pureConfigCollection.values.push(keyExpressionInstance);
    }
  });
  pureConfigCollection.multiplicity = new Multiplicity(
    pureConfigCollection.values.length,
    pureConfigCollection.values.length,
  );
  newFunction.parametersValues = [
    instance,
    primitiveInstance,
    pureConfigCollection,
  ];
  return newFunction;
};

export const buildSerialzieFunctionWithGraphFetch = (
  tree: RootGraphFetchTree,
  isChecked: boolean,
  precedingExpression: ValueSpecification,
  pureConfig: SimpleFunctionExpression | undefined,
): SimpleFunctionExpression => {
  const graphFetchInstance = new GraphFetchTreeInstanceValue();
  graphFetchInstance.values = [tree];
  const serializeFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE),
  );
  const graphFetchFunc = new SimpleFunctionExpression(
    isChecked
      ? extractElementNameFromPath(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
        )
      : extractElementNameFromPath(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
        ),
  );
  graphFetchFunc.parametersValues = [precedingExpression, graphFetchInstance];
  serializeFunction.parametersValues = [graphFetchFunc, graphFetchInstance];
  if (pureConfig) {
    serializeFunction.parametersValues.push(pureConfig);
  }
  return serializeFunction;
};

export const appendGraphFetch = (
  graphFetchTreeState: QueryBuilderGraphFetchTreeState,
  lambdaFunction: LambdaFunction,
  options?: {
    /**
     * Set queryBuilderState to `true` when we construct query for execution within the app.
     * queryBuilderState will make the lambda function building process overrides several query values, such as the row limit.
     */
    isBuildingExecutionQuery?: boolean | undefined;
    keepSourceInformation?: boolean | undefined;
  },
): void => {
  const queryBuilderState = graphFetchTreeState.queryBuilderState;
  const precedingExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
    `Can't build graph-fetch tree expression: preceding expression is not defined`,
  );

  const serializationState = graphFetchTreeState.serializationState;
  if (serializationState instanceof GraphFetchPureSerializationState) {
    // build graph-fetch tree
    if (
      graphFetchTreeState.treeData &&
      !isGraphFetchTreeDataEmpty(graphFetchTreeState.treeData)
    ) {
      const pureConfig = serializationState.config
        ? buildPureSerializationConfig(
            serializationState.config as unknown as Record<
              PropertyKey,
              boolean
            >,
            graphFetchTreeState.queryBuilderState.graphManagerState.graph,
          )
        : undefined;
      const serializeFunction = buildSerialzieFunctionWithGraphFetch(
        graphFetchTreeState.treeData.tree,
        graphFetchTreeState.isChecked,
        precedingExpression,
        pureConfig,
      );
      lambdaFunction.expressionSequence[0] = serializeFunction;
    }
  } else if (
    serializationState instanceof GraphFetchExternalFormatSerializationState
  ) {
    const externalizeFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXTERNALIZE),
    );
    const mainGraphTree = graphFetchTreeState.treeData;
    const externalizeGraphFetchTreeData = serializationState.treeData;
    if (
      mainGraphTree &&
      externalizeGraphFetchTreeData &&
      !isGraphFetchTreeDataEmpty(mainGraphTree) &&
      !isGraphFetchTreeDataEmpty(externalizeGraphFetchTreeData)
    ) {
      // 0th param
      const graphFetchInstance = new GraphFetchTreeInstanceValue();
      graphFetchInstance.values = [mainGraphTree.tree];
      const graphFetchFunc = new SimpleFunctionExpression(
        graphFetchTreeState.isChecked
          ? extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
            )
          : extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
            ),
      );
      graphFetchFunc.parametersValues = [
        precedingExpression,
        graphFetchInstance,
      ];
      // 1st param
      const bindingInstance = new InstanceValue(Multiplicity.ONE, undefined);
      bindingInstance.values = [
        PackageableElementExplicitReference.create(
          serializationState.targetBinding,
        ),
      ];
      // 2nd parameter
      const xtGraphFetchInstance = new GraphFetchTreeInstanceValue();
      xtGraphFetchInstance.values = [externalizeGraphFetchTreeData.tree];
      // build externalize
      externalizeFunction.parametersValues = [
        graphFetchFunc,
        bindingInstance,
        xtGraphFetchInstance,
      ];
      lambdaFunction.expressionSequence[0] = externalizeFunction;
    }
  } else {
    throw new UnsupportedOperationError(
      `Unsupported serialization state ${serializationState.getLabel()}`,
    );
  }
  // build result set modifier: i.e. preview limit
  if (options?.isBuildingExecutionQuery) {
    appendTakeLimit(lambdaFunction, queryBuilderState.resultState.previewLimit);
  }
};
