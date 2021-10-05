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

export const TEST_DATA__roundtrip = [
  {
    path: 'test::model::TestDataSpace',
    content: {
      _type: 'dataSpace',
      artifactId: 'test-data-space',
      defaultExecutionContext: 'INT',
      description: 'some description 2',
      executionContexts: [
        {
          defaultRuntime: {
            path: 'test::model::TestRuntime',
            type: 'RUNTIME',
          },
          description: 'some description 1',
          mapping: {
            path: 'test::model::TestMapping',
            type: 'MAPPING',
          },
          name: 'INT',
        },
      ],
      featuredDiagrams: [
        {
          path: 'test::model::TestDiagram1',
          type: 'DIAGRAM',
        },
        {
          path: 'test::model::TestDiagram2',
          type: 'DIAGRAM',
        },
      ],
      groupId: 'test.group',
      name: 'TestDataSpace',
      package: 'test::model',
      supportInfo: {
        _type: 'email',
        address: 'testEmail@test.org',
      },
      versionId: '0.4.3',
    },
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  },
];
