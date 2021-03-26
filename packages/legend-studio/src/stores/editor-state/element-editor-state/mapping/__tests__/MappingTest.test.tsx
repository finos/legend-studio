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
  guaranteeType,
  losslessParse,
  unitTest,
} from '@finos/legend-studio-shared';
import { flowResult } from 'mobx';
import { AbstractEngineConfig } from '../../../../../models/metamodels/pure/action/AbstractEngineConfiguration';
import { JsonExecutionResult } from '../../../../../models/metamodels/pure/action/execution/ExecutionResult';
import { ExpectedOutputMappingTestAssert } from '../../../../../models/metamodels/pure/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import {
  ObjectInputData,
  OBJECT_INPUT_TYPE,
} from '../../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { getRawGraphFetchTreeData } from '../../../../shared/RawGraphFetchTreeUtil';
import { getTestEditorStore } from '../../../../StoreTestUtils';
import { MappingEditorState } from '../MappingEditorState';
import {
  MappingExecutionGraphFetchQueryState,
  MappingExecutionJsonModelConnectionRuntimeState,
} from '../MappingExecutionState';
import {
  mappingTestData,
  executeResultResponse,
  generatedSourceData,
} from './MappingTestData';

test(
  unitTest(
    'Test creating mapping test and saving/displaying input and expected result data',
  ),
  async () => {
    // setup up test and open mapping editor
    const editorStore = getTestEditorStore();
    await editorStore.graphState.initializeSystem();
    await editorStore.graphState.graphManager.buildGraph(
      editorStore.graphState.graph,
      mappingTestData,
      { TEMPORARY__keepSectionIndex: true },
    );
    const result = losslessParse(executeResultResponse) as JsonExecutionResult;
    const jsonResult = new JsonExecutionResult(result.values);
    jest
      .spyOn(editorStore.graphState.graphManager, 'executeMapping')
      .mockResolvedValue(jsonResult);
    jest
      .spyOn(editorStore.graphState.graphManager, 'getEngineConfig')
      .mockReturnValue(new AbstractEngineConfig());
    const mapping = editorStore.graphState.graph.getMapping(
      'model::SimpleMapping',
    );
    const targetClass = editorStore.graphState.graph.getClass(
      'model::Target_Person',
    );
    const sourceClass = editorStore.graphState.graph.getClass(
      'model::Source_Person',
    );
    editorStore.openElement(mapping);
    const mappingEditorState = editorStore.getCurrentEditorState(
      MappingEditorState,
    );
    const executionState = mappingEditorState.executionState;
    // set target class and build graph fetch tree
    const queryState = new MappingExecutionGraphFetchQueryState(editorStore);
    queryState.setTarget(targetClass);
    queryState.setGraphFetchTree(
      getRawGraphFetchTreeData(editorStore, targetClass, mapping),
    );
    // populate test data
    const runtimeState = new MappingExecutionJsonModelConnectionRuntimeState(
      editorStore,
      mapping,
    );
    runtimeState.setSourceClass(sourceClass);
    runtimeState.setTestData(JSON.stringify(generatedSourceData, undefined, 2));
    executionState.setRuntimeState(runtimeState);
    const testData = JSON.parse(runtimeState.testData) as Record<
      string,
      string
    >;
    expect(testData.sFirstName).toEqual('myFirstName');
    expect(testData.sLastName).toEqual('myLastName');
    executionState.setQueryState(queryState);
    const expectedTestDataDisplay =
      '{\n  "sFirstName": "myFirstName",\n  "sLastName": "myLastName"\n}';
    expect(runtimeState.testData).toBe(expectedTestDataDisplay);
    const inputData = runtimeState.inputData;
    const jsonInputData = guaranteeType(inputData, ObjectInputData);
    expect(jsonInputData.sourceClass.value).toBe(sourceClass);
    expect(jsonInputData.inputType).toBe(OBJECT_INPUT_TYPE.JSON);
    expect(jsonInputData.data).toBe(
      '{"sFirstName":"myFirstName","sLastName":"myLastName"}',
    );
    // execute mapping
    await flowResult(executionState.executeMapping());
    const expectedResultDisplay =
      '{\n  "defects": [\n\n  ],\n  "source": {\n    "defects": [\n\n    ],\n    "source": {\n      "number": 1,\n      "record": "{\\"sFirstName\\":\\"myFirstName\\",\\"sLastName\\":\\"myLastName\\"}"\n    },\n    "value": {\n      "sFirstName": "myFirstName",\n      "sLastName": "myLastName"\n    }\n  },\n  "value": {\n    "firstName": "myFirstName",\n    "lastName": "myLastName"\n  }\n}';
    expect(executionState.executionResultText).toBe(expectedResultDisplay);
    // promote to test and assert correct input and expected result data
    await flowResult(executionState.promoteToTest());
    const mappingTest = mapping.tests[0];
    expect(mappingTest).toBeTruthy();
    const testInputData = mappingTest.inputData[0];
    expect(testInputData).toBeTruthy();
    const testObjectInputData = guaranteeType(testInputData, ObjectInputData);
    expect(testObjectInputData.sourceClass.value).toBe(sourceClass);
    expect(testObjectInputData.inputType).toBe(OBJECT_INPUT_TYPE.JSON);
    expect(testObjectInputData.data).toBe(
      '{"sFirstName":"myFirstName","sLastName":"myLastName"}',
    );
    const testAssert = guaranteeType(
      mappingTest.assert,
      ExpectedOutputMappingTestAssert,
    );
    const savedExpectedResult =
      '{"defects":[],"source":{"defects":[],"source":{"number":1,"record":"{\\"sFirstName\\":\\"myFirstName\\",\\"sLastName\\":\\"myLastName\\"}"},"value":{"sFirstName":"myFirstName","sLastName":"myLastName"}},"value":{"firstName":"myFirstName","lastName":"myLastName"}}';
    expect(testAssert.expectedOutput).toBe(savedExpectedResult);
  },
);
