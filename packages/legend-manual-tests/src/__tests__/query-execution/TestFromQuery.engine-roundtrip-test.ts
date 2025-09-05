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

import { test, expect } from '@jest/globals';
import { resolve } from 'path';
import { TEST_DATA_QueryExecution_ExecutionInput } from './TEST_DATA_QueryBuilder_Query_Execution.js';
import {
  create_RawLambda,
  type V1_PureGraphManager,
  RuntimePointer,
  PackageableElementExplicitReference,
  V1_RuntimePointer,
  V1_serializeRawValueSpecification,
} from '@finos/legend-graph';
import { integrationTest } from '@finos/legend-shared/test';
import { TEST__LegendApplicationPluginManager } from '@finos/legend-query-builder';
import { TEST__setUpGraphManagerState } from '@finos/legend-query-builder/test';
import {
  ENGINE_TEST_SUPPORT__grammarToJSON_lambda,
  ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification,
} from '@finos/legend-graph/test';
import { generateModelEntitesFromModelGrammar } from '../utils/testUtils.js';

test(integrationTest('Test Building of From Queries'), async () => {
  const { mappingPath, runtimePath, modelFileDir, modelFilePath, rawLambda } = {
    mappingPath: 'model::RelationalMapping',
    runtimePath: 'model::Runtime',
    modelFileDir: 'model',
    modelFilePath: 'TEST_DATA_QueryBuilder_Query_Execution_model.pure',
    rawLambda: TEST_DATA_QueryExecution_ExecutionInput,
  };
  const entities = await generateModelEntitesFromModelGrammar(
    resolve(__dirname, modelFileDir),
    modelFilePath,
    undefined,
  );

  const pluginManager = TEST__LegendApplicationPluginManager.create();
  const graphManagerState = await TEST__setUpGraphManagerState(
    entities,
    pluginManager,
  );

  const v1Manager = graphManagerState.graphManager as V1_PureGraphManager;

  const graph = graphManagerState.graph;
  const mapping = graph.getMapping(mappingPath);
  const runtime = graph.getRuntime(runtimePath);
  const runtimePointer = new RuntimePointer(
    PackageableElementExplicitReference.create(runtime),
  );
  const executeInput = v1Manager.createExecutionInput(
    graph,
    mapping,
    create_RawLambda(rawLambda.parameters, rawLambda.body),
    runtimePointer,
    undefined,
  );
  expect(executeInput.mapping).toBe(mappingPath);
  expect(executeInput.runtime instanceof V1_RuntimePointer).toBe(true);
  expect((executeInput.runtime as V1_RuntimePointer).runtime).toBe(runtimePath);
  const fromExecuteInput = v1Manager.createExecutionInput(
    graph,
    mapping,
    create_RawLambda(rawLambda.parameters, rawLambda.body),
    runtimePointer,
    undefined,
    {
      forceFromExpression: true,
    },
  );
  expect(fromExecuteInput.mapping).toBeUndefined();
  expect(fromExecuteInput.runtime).toBeUndefined();

  const fromNoMappingExecuteInput = v1Manager.createExecutionInput(
    graph,
    undefined,
    create_RawLambda(rawLambda.parameters, rawLambda.body),
    runtimePointer,
    undefined,
    {
      forceFromExpression: true,
    },
  );
  expect(fromNoMappingExecuteInput.mapping).toBeUndefined();
  expect(fromNoMappingExecuteInput.runtime).toBeUndefined();

  const executeInputLambdaGrammar =
    await ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(
      V1_serializeRawValueSpecification(executeInput.function),
    );

  const fromExecuteInputLambdaGrammar =
    await ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(
      V1_serializeRawValueSpecification(fromExecuteInput.function),
    );

  const fromNoMappingExecuteInputLambdaGrammar =
    await ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(
      V1_serializeRawValueSpecification(fromNoMappingExecuteInput.function),
    );

  expect(executeInputLambdaGrammar).toBe(
    `var: Integer[1]|model::Person.all()->filter(x|$x.age == $var)->project([x|$x.age], ['Age'])->take(1000)`,
  );
  expect(fromExecuteInputLambdaGrammar).toBe(
    `var: Integer[1]|model::Person.all()->filter(x|$x.age == $var)->project([x|$x.age], ['Age'])->take(1000)->from(model::RelationalMapping, model::Runtime)`,
  );
  expect(fromNoMappingExecuteInputLambdaGrammar).toBe(
    `var: Integer[1]|model::Person.all()->filter(x|$x.age == $var)->project([x|$x.age], ['Age'])->take(1000)->from(model::Runtime)`,
  );
  // let statements
  const withLetStatements = `var: Integer[1]| let date = now(); model::Person.all()->filter(x|$x.age == $var)->project([x|$x.age], ['Age'])->take(1000);`;
  const letFunc = (await ENGINE_TEST_SUPPORT__grammarToJSON_lambda(
    withLetStatements,
  )) as unknown as { parameters: object | undefined; body: object | undefined };
  const letLambda = create_RawLambda(letFunc.parameters, letFunc.body);
  const letLambdaExecuteInput = v1Manager.createExecutionInput(
    graph,
    mapping,
    letLambda,
    runtimePointer,
    undefined,
    {
      forceFromExpression: true,
    },
  );
  expect(letLambdaExecuteInput.mapping).toBeUndefined();
  expect(letLambdaExecuteInput.runtime).toBeUndefined();
  const letLambdaExecuteInputLambdaGrammar =
    await ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(
      V1_serializeRawValueSpecification(letLambdaExecuteInput.function),
      false,
    );

  expect(
    letLambdaExecuteInputLambdaGrammar.includes(
      `->from(model::RelationalMapping, model::Runtime)`,
    ),
  ).toBe(true);

  const executeInputWithoutRuntimePointer = v1Manager.createExecutionInput(
    graph,
    mapping,
    create_RawLambda(rawLambda.parameters, rawLambda.body),
    runtime.runtimeValue,
    undefined,
    {
      forceFromExpression: true,
    },
  );
  expect(executeInputWithoutRuntimePointer.mapping).toBeDefined();
  expect(executeInputWithoutRuntimePointer.runtime).toBeDefined();
});
