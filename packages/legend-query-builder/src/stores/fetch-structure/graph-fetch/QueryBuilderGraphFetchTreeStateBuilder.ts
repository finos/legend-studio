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
  PrimitiveInstanceValue,
  type KeyExpression,
  PRIMITIVE_TYPE,
  type LambdaFunction,
  GraphFetchTreeInstanceValue,
  matchFunctionName,
  RootGraphFetchTree,
  SimpleFunctionExpression,
  InstanceValue,
  PackageableElementReference,
  Binding,
  SUPPORTED_FUNCTIONS,
  Class,
  KeyExpressionInstanceValue,
  CollectionInstanceValue,
  getClassProperty,
  PrimitiveType,
  VariableExpression,
} from '@finos/legend-graph';
import {
  assertIsBoolean,
  assertIsString,
  assertTrue,
  assertType,
  guaranteeIsString,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import {
  QUERY_BUILDER_PURE_PATH,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
} from '../../../graph/QueryBuilderMetaModelConst.js';
import { type QueryBuilderState } from '../../QueryBuilderState.js';
import { QueryBuilderValueSpecificationProcessor } from '../../QueryBuilderStateBuilder.js';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../QueryBuilderFetchStructureImplementationState.js';
import {
  GraphFetchExternalFormatSerializationState,
  GraphFetchPureSerializationState,
  PureSerializationConfig,
  QueryBuilderGraphFetchTreeState,
} from './QueryBuilderGraphFetchTreeState.js';
import { buildGraphFetchTreeData } from './QueryBuilderGraphFetchTreeUtil.js';
import {} from 'mobx';
import { QueryBuilderInternalizeState } from '../../QueryBuilderInternalizeState.js';

export const processGraphFetchExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  const functionName = expression.functionName;

  // check parameters
  assertTrue(
    expression.parametersValues.length === 2,
    `Can't process ${functionName}() expression: ${functionName}() expects 1 argument`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process ${functionName}() expression: only support ${functionName}() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
    ]),
    `Can't process ${functionName}(): only support ${functionName}() immediately following either getAll() or filter()`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderGraphFetchTreeState
  ) {
    const graphFetchTreeState =
      queryBuilderState.fetchStructureState.implementation;
    graphFetchTreeState.setChecked(
      matchFunctionName(
        expression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
      ),
    );
  }
};

export const processInternalizeExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // update fetch-structure
  queryBuilderState.fetchStructureState.changeImplementation(
    FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH,
  );
  const functionName = expression.functionName;
  // check parameters
  assertTrue(
    expression.parametersValues.length === 3,
    `Can't process ${functionName}() expression: ${functionName}() expects 2 argument`,
  );

  // first param classs
  const classVal = expression.parametersValues[0];
  const _class = classVal?.genericType?.value.rawType;
  assertType(
    _class,
    Class,
    `Can't process internalize() expression: internalize() return type is missing`,
  );

  queryBuilderState.setClass(_class);
  queryBuilderState.milestoningState.clearMilestoningDates();
  queryBuilderState.explorerState.refreshTreeData();

  // binding
  const instanceExpression = guaranteeType(
    expression.parametersValues[1],
    InstanceValue,
    `Can't process internalize() expression: only support internalize() with 1st parameter as instance value`,
  );
  const binding = guaranteeType(
    guaranteeType(
      instanceExpression.values[0],
      PackageableElementReference,
      `Can't process internalize() expression: only support internalize() with 1st parameter as packagableElement value`,
    ).value,
    Binding,
    `Can't process internalize() expression: only support internalize() with 1st parameter as binding value`,
  );

  const variableExpression = guaranteeType(
    expression.parametersValues[2],
    VariableExpression,
  );

  const inernalize = new QueryBuilderInternalizeState(
    binding,
    variableExpression,
    queryBuilderState,
  );

  queryBuilderState.setInternalize(inernalize);
};

type PropertyValue = object | string | number | boolean;

// Dynamically sets key values of config
// TODO we can further enhance this by making configInstance just a list of key value pairs and using class config definition to render in query builder
const processKeyExpressionValueOnSerializationConfig = (
  keyExpression: KeyExpression,
  configInstance: Record<PropertyKey, PropertyValue>,
  configClassDef: Class,
  idx: number,
): void => {
  // initial checks
  const expressionKey = guaranteeType(
    keyExpression.key,
    PrimitiveInstanceValue,
    `Can't process serialize() expression: serialization config key expression ${idx} key expected to be a primitive value`,
  );
  assertTrue(
    expressionKey.genericType.value.rawType.path === PRIMITIVE_TYPE.STRING,
    `Can't process serialize() expression: serialization config key expression ${idx} key expected to be a primitive string value`,
  );
  const keyValue = guaranteeIsString(
    expressionKey.values[0],
    `Can't process serialize() expression: serialization config key expression ${idx} expected to be a non-nullable primitive string value`,
  );
  // check instance
  const properties = Object.getOwnPropertyNames(configInstance);
  guaranteeNonNullable(
    properties.find((prop) => prop === keyValue),
    `Property name '${keyValue}' not defined in serialization config, accepted properties are ${properties.join(
      ',',
    )}`,
  );
  // check class
  const _classProperty = getClassProperty(configClassDef, keyValue);
  const _classType = guaranteeType(
    _classProperty.genericType.value.rawType,
    PrimitiveType,
    `Only primitive types suppported for config. Property ${keyValue} for class '${QUERY_BUILDER_PURE_PATH.SERIALIZE_CONFIG}' is of type '${_classProperty.genericType.value.rawType.path}'`,
  );
  const expressionValue = guaranteeNonNullable(
    guaranteeType(
      keyExpression.expression,
      PrimitiveInstanceValue,
      `Can't process serialize() expression: config key expression's value expected to be a primitive instance value`,
    ).values[0],
    `Can't process serialize() expression: config key expression's value expected to be a non nullable primitive value`,
  );
  // TODO move to separate method and make it more robust
  switch (_classType.path) {
    case PRIMITIVE_TYPE.STRING:
      assertIsString(expressionValue);
      break;
    case PRIMITIVE_TYPE.BOOLEAN:
      assertIsBoolean(expressionValue);
      break;
    default:
      return;
  }
  configInstance[keyValue] = expressionValue as PropertyValue;
};

export const processGraphFetchSerializeExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // update fetch-structure
  queryBuilderState.fetchStructureState.changeImplementation(
    FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH,
  );

  // check parameters
  assertTrue(
    expression.parametersValues.length === 2 ||
      expression.parametersValues.length === 3,
    `Can't process serialize() expression: serialize() expects 1 or 2 argument`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process serialize() expression: only support serialize() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
    ]),
    `Can't process serialize() expression: only support serialize() in graph-fetch expression`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderGraphFetchTreeState
  ) {
    const graphFetchTreeState =
      queryBuilderState.fetchStructureState.implementation;
    const graphFetchTree = guaranteeType(
      expression.parametersValues[1],
      GraphFetchTreeInstanceValue,
      `Can't process serialize() expression: serialize() graph-fetch is missing`,
    );
    const graphFetchTreeRoot = guaranteeType(
      graphFetchTree.values[0],
      RootGraphFetchTree,
      `Can't process serialize() expression: serialize() graph-fetch tree root is missing`,
    );

    assertTrue(
      graphFetchTreeRoot.subTypeTrees.length === 0,
      `Can't process serialize() expression: subTypeTree is not supported.`,
    );

    graphFetchTreeState.setGraphFetchTree(
      buildGraphFetchTreeData(graphFetchTreeRoot),
    );

    const serializeConfigParameter = expression.parametersValues[2];
    if (serializeConfigParameter) {
      const pureConfigFunction = guaranteeType(
        serializeConfigParameter,
        SimpleFunctionExpression,
        `Can't process serialize() expression: serialize() function expects a function to configure custom serialization`,
      );
      assertTrue(
        matchFunctionName(pureConfigFunction.functionName, [
          SUPPORTED_FUNCTIONS.NEW,
        ]),
        `Can't process serialize() expression: config expects 'new' function instaniate new config class`,
      );

      const pureSerializationState = guaranteeType(
        graphFetchTreeState.serializationState,
        GraphFetchPureSerializationState,
        `Can't process serialize() expression: serialization state expected to be of type pure with serialize()`,
      );
      // first para: config class
      const configClass = guaranteeType(
        guaranteeType(
          guaranteeType(
            pureConfigFunction.parametersValues[0],
            InstanceValue,
            `Can't process serialize() expression: serialization config expects first param to be an instance value`,
          ).values[0],
          PackageableElementReference,
          `Can't process serialize() expression: serialization config expects first param to be a packageable element`,
        ).value,
        Class,
        `Can't process serialize() expression: serialization config expects first param to be a class`,
      );
      assertTrue(
        configClass.path === QUERY_BUILDER_PURE_PATH.SERIALIZE_CONFIG,
        `Can't process serialize() expression: serialiaztion config class expected to be '${QUERY_BUILDER_PURE_PATH.SERIALIZE_CONFIG}', got : ${configClass.path}`,
      );
      // 2nd param: empty string
      // TODO: Investigate why `new` function as the second input as empty string

      // 2rd param: key expression values representing property values of config
      const collectionInstanceValue = guaranteeType(
        pureConfigFunction.parametersValues[2],
        CollectionInstanceValue,
        `Can't process serialize() expression: serialization config expects third param to be a collection instance of key expressions`,
      );
      const serializationConfig = new PureSerializationConfig();
      collectionInstanceValue.values.forEach((val, idx) => {
        const keyExpInstance = guaranteeType(
          val,
          KeyExpressionInstanceValue,
          `Can't process serialize() expression: collection instance value expects value ${
            idx + 1
          } to be key expression instance `,
        );
        const keyExpression = guaranteeNonNullable(
          keyExpInstance.values[0],
          `Can't process serialize() expression: serialization config key expression ${idx} expected to non null`,
        );
        processKeyExpressionValueOnSerializationConfig(
          keyExpression,
          serializationConfig as unknown as Record<PropertyKey, PropertyValue>,
          configClass,
          idx,
        );
      });
      pureSerializationState.setConfig(serializationConfig);
    }
  }
};

export const processGraphFetchExternalizeExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // update fetch-structure
  queryBuilderState.fetchStructureState.changeImplementation(
    FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH,
  );

  // check parameters
  assertTrue(
    expression.parametersValues.length === 3,
    `Can't process externalize() expression: externalize() expects 2 argument`,
  );

  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process externalize() expression: only support externalize() immediately following an expression`,
  );

  // build preceding expression
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.INTERNALIZE,
    ]),
    `Can't process externalize() expression: only support externalize() in graph-fetch expression`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderGraphFetchTreeState
  ) {
    const graphFetchTreeState =
      queryBuilderState.fetchStructureState.implementation;
    // TODO: move to graph fetch processing once we completely deattach serialize graph fetch from main graphfetch tree
    const mainGraphFetchTree = guaranteeType(
      precedingExpression.parametersValues[1],
      GraphFetchTreeInstanceValue,
      `Can't process graphfetch() expression: externalize() graph-fetch is missing`,
    );
    const mainGraphFetchTreeRoot = guaranteeType(
      mainGraphFetchTree.values[0],
      RootGraphFetchTree,
      `Can't process graphfetch() expression: graph-fetch tree root is missing`,
    );
    graphFetchTreeState.setGraphFetchTree(
      buildGraphFetchTreeData(mainGraphFetchTreeRoot),
    );

    // build externalizeState
    const instanceExpression = guaranteeType(
      expression.parametersValues[1],
      InstanceValue,
      `Can't process externalize() expression: only support externalize() with 1st parameter as instance value`,
    );
    const binding = guaranteeType(
      guaranteeType(
        instanceExpression.values[0],
        PackageableElementReference,
        `Can't process externalize() expression: only support externalize() with 1st parameter as packagableElement value`,
      ).value,
      Binding,
      `Can't process externalize() expression: only support externalize() with 1st parameter as binding value`,
    );
    const externalizeState = new GraphFetchExternalFormatSerializationState(
      graphFetchTreeState,
      binding,
      undefined,
    );
    graphFetchTreeState.setSerializationState(externalizeState);

    const graphFetchTree = guaranteeType(
      expression.parametersValues[2],
      GraphFetchTreeInstanceValue,
      `Can't process externalize() expression: externalize() graph-fetch is missing`,
    );
    const graphFetchTreeRoot = guaranteeType(
      graphFetchTree.values[0],
      RootGraphFetchTree,
      `Can't process externalize() expression: externalize() graph-fetch tree root is missing`,
    );
    externalizeState.setGraphFetchTree(
      buildGraphFetchTreeData(graphFetchTreeRoot),
    );
  }
};
