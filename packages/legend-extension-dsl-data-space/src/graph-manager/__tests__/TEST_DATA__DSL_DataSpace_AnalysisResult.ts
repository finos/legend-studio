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

const TEST_DATA__emptyModel = {
  _type: 'data',
  elements: [],
};

export const TEST_DATA__analysisResult_roundtrip = {
  name: 'TestDataProduct',
  package: 'test::product',
  path: 'test::product::TestDataProduct',
  title: 'Test Data Product',
  description: 'A data product used to verify analysis-result serialization',
  taggedValues: [],
  stereotypes: [],
  model: TEST_DATA__emptyModel,
  executionContexts: [
    {
      name: 'mappingBased',
      title: 'Mapping-based context',
      mapping: 'test::product::mapping::TestMapping',
      defaultRuntime: 'test::product::runtime::TestRuntime',
      compatibleRuntimes: ['test::product::runtime::TestRuntime'],
      datasets: [],
    },
    {
      name: 'providerBased',
      title: 'Mapping-provider-based context',
      mappingProvider: {
        element: 'test::product::TestDataProduct',
        keys: ['modelAccessGroupPointId'],
      },
      compatibleRuntimes: [],
      datasets: [],
    },
  ],
  defaultExecutionContext: 'mappingBased',
  elements: [],
  elementDocs: [],
  executables: [
    {
      title: 'An executable with a return type',
      description: 'Carries executableReturnType, which is bidirectional',
      executable: 'test::product::service::TestService',
      executableReturnType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'String',
        },
      },
    },
  ],
};

export const TEST_DATA__analysisResult_noDefaultExecutionContext = {
  name: 'NoDefaultProduct',
  package: 'test::product',
  path: 'test::product::NoDefaultProduct',
  taggedValues: [],
  stereotypes: [],
  model: TEST_DATA__emptyModel,
  executionContexts: [
    {
      name: 'onlyContext',
      mapping: 'test::product::mapping::TestMapping',
      defaultRuntime: 'test::product::runtime::TestRuntime',
      compatibleRuntimes: ['test::product::runtime::TestRuntime'],
      datasets: [],
    },
  ],
  elements: [],
  elementDocs: [],
  diagrams: [],
  executables: [],
};

export const TEST_DATA__analysisResult_danglingDefaultExecutionContext = {
  ...TEST_DATA__analysisResult_noDefaultExecutionContext,
  name: 'DanglingDefaultProduct',
  path: 'test::product::DanglingDefaultProduct',
  defaultExecutionContext: 'thisContextDoesNotExist',
};

export const TEST_DATA__analysisResult_contextWithoutMappingOrRuntime = {
  name: 'NoMappingProduct',
  package: 'test::product',
  path: 'test::product::NoMappingProduct',
  taggedValues: [],
  stereotypes: [],
  model: TEST_DATA__emptyModel,
  executionContexts: [
    {
      name: 'bareContext',
      compatibleRuntimes: [],
      datasets: [],
    },
  ],
  defaultExecutionContext: 'bareContext',
  elements: [],
  elementDocs: [],
  diagrams: [],
  executables: [],
};

export const TEST_DATA__analysisResult_executableWithoutResult = {
  name: 'NoResultProduct',
  package: 'test::product',
  path: 'test::product::NoResultProduct',
  taggedValues: [],
  stereotypes: [],
  model: TEST_DATA__emptyModel,
  executionContexts: [
    {
      name: 'onlyContext',
      mapping: 'test::product::mapping::TestMapping',
      defaultRuntime: 'test::product::runtime::TestRuntime',
      compatibleRuntimes: ['test::product::runtime::TestRuntime'],
      datasets: [],
    },
  ],
  defaultExecutionContext: 'onlyContext',
  elements: [],
  elementDocs: [],
  diagrams: [],
  executables: [
    {
      title: 'Executable with no result at all',
      executable: 'test::product::service::NoResult',
    },
    {
      title: 'Executable with an explicitly null result',
      executable: 'test::product::service::NullResult',
      result: null,
    },
  ],
};

export const TEST_DATA__analysisResult_multiExecutionExecutable = {
  name: 'MultiExecProduct',
  package: 'test::product',
  path: 'test::product::MultiExecProduct',
  taggedValues: [],
  stereotypes: [],
  model: TEST_DATA__emptyModel,
  executionContexts: [
    {
      name: 'onlyContext',
      mapping: 'test::product::mapping::TestMapping',
      defaultRuntime: 'test::product::runtime::TestRuntime',
      compatibleRuntimes: ['test::product::runtime::TestRuntime'],
      datasets: [],
    },
  ],
  defaultExecutionContext: 'onlyContext',
  elements: [],
  elementDocs: [],
  diagrams: [],
  executables: [
    {
      title: 'A multi-execution service',
      executable: 'test::product::service::MultiExecService',
      info: {
        _type: 'multiExecutionService',
        pattern: '/test/multi',
        query: 'src|src.all()',
        keyedExecutableInfos: [
          {
            key: 'UAT',
            mapping: 'test::product::mapping::TestMapping',
            runtime: 'test::product::runtime::TestRuntime',
            datasets: [],
          },
          {
            key: 'PROD',
            mapping: 'test::product::mapping::TestMapping',
            runtime: 'test::product::runtime::TestRuntime',
            datasets: [],
          },
        ],
      },
    },
  ],
};
