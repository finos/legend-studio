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

const personRelationElementsData = (firstName: string) => ({
  _type: 'relationElementsData',
  relationElements: [
    {
      _type: 'relationElement',
      columns: ['id', 'firstName'],
      paths: ['default', 'PersonTable'],
      rows: [
        {
          values: ['1', firstName],
        },
      ],
    },
  ],
});

const helloFunctionTest = {
  _type: 'functionTest',
  assertions: [
    {
      _type: 'equalTo',
      expected: {
        _type: 'string',
        value: 'Hello World!',
      },
      id: 'default',
    },
  ],
  id: 'test_1',
};

const functionEntity = (tests: object[]) => ({
  path: 'my::Hello__String_1_',
  content: {
    _type: 'function',
    body: [
      {
        _type: 'string',
        value: 'Hello World!',
      },
    ],
    name: 'Hello__String_1_',
    package: 'my',
    parameters: [],
    postConstraints: [],
    preConstraints: [],
    returnGenericType: {
      rawType: {
        _type: 'packageableType',
        fullPath: 'String',
      },
    },
    returnMultiplicity: {
      lowerBound: 1,
      upperBound: 1,
    },
    tests,
  },
  classifierPath: 'meta::pure::metamodel::function::ConcreteFunctionDefinition',
});

const supportingEntities = [
  {
    path: 'my::TestDB',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'TestDB',
      package: 'my',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'firstName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'PersonTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'my::SharedData',
    content: {
      _type: 'dataElement',
      data: personRelationElementsData('John'),
      name: 'SharedData',
      package: 'my',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
];

export const TEST_DATA__FunctionTestDataRoundtrip = [
  ...supportingEntities,
  functionEntity([
    {
      _type: 'functionTestSuite',
      id: 'baseOnly',
      testData: [
        {
          data: personRelationElementsData('John'),
          packageableElementPointer: {
            path: 'my::TestDB',
          },
        },
      ],
      tests: [helloFunctionTest],
    },
    {
      _type: 'functionTestSuite',
      id: 'referenceWithBaseOverride',
      testData: [
        {
          _type: 'referenceDataResolver',
          elementPointer: {
            path: 'my::SharedData',
          },
        },
        {
          data: personRelationElementsData('Nicole'),
          packageableElementPointer: {
            path: 'my::TestDB',
          },
        },
      ],
      tests: [helloFunctionTest],
    },
  ]),
];

export const TEST_DATA__FunctionTestDataWithDataResolverProtocol = [
  ...supportingEntities,
  functionEntity([
    {
      _type: 'functionTestSuite',
      id: 'baseOnly',
      testData: [
        {
          _type: 'baseDataResolver',
          data: personRelationElementsData('John'),
          elementPointer: {
            path: 'my::TestDB',
          },
        },
      ],
      tests: [helloFunctionTest],
    },
    {
      _type: 'functionTestSuite',
      id: 'referenceWithBaseOverride',
      testData: [
        {
          _type: 'referenceDataResolver',
          elementPointer: {
            path: 'my::SharedData',
          },
        },
        {
          data: personRelationElementsData('Nicole'),
          store: 'my::TestDB',
        },
      ],
      tests: [helloFunctionTest],
    },
  ]),
];
