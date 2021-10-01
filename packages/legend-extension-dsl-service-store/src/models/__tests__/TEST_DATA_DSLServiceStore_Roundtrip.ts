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

export const roundtripTestData = [
  {
    path: 'test::ServiceStore1',
    content: {
      _type: 'serviceStore',
      name: 'ServiceStore1',
      package: 'test',
      elements: [
        {
          _type: 'service',
          id: 'TestService',
          method: 'GET',
          parameters: [
            {
              location: 'QUERY',
              name: 'serializationFormat',
              serializationFormat: {},
              type: {
                _type: 'string',
                list: false,
              },
            },
          ],
          path: '/testService',
          response: {
            _type: 'complex',
            binding: 'test::Binding',
            list: false,
            type: 'test::A',
          },
          security: [],
        },
      ],
    },
    classifierPath: 'meta::external::store::service::metamodel::ServiceStore',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::ServiceStore1'],
          parserName: 'ServiceStore',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
