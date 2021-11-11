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

export const TEST_DATA__Auto_M2M = [
  {
    path: 'test::autoMapping::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test::autoMapping',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'location',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::autoMapping::SFrim',
    content: {
      _type: 'class',
      name: 'SFrim',
      package: 'test::autoMapping',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'location',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::autoMapping::AutoMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::autoMapping::Firm',
          propertyMappings: [],
          root: true,
          srcClass: 'test::autoMapping::SFrim',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'AutoMapping',
      package: 'test::autoMapping',
      tests: [
        {
          assert: {
            _type: 'expectedOutputMappingTestAssert',
            expectedOutput:
              '{"defects":[],"source":{"defects":[],"source":{"number":1,"record":"{\\"name\\":\\"name 47\\",\\"location\\":\\"location 66\\"}"},"value":{}},"value":{"location":"location 66","name":"name 47"}}',
          },
          inputData: [
            {
              _type: 'object',
              data: '{"name":"name 47","location":"location 66"}',
              inputType: 'JSON',
              sourceClass: 'test::autoMapping::SFrim',
            },
          ],
          name: 'test_1',
          query: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'serialize',
                parameters: [
                  {
                    _type: 'func',
                    function: 'graphFetchChecked',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'test::autoMapping::Firm',
                          },
                        ],
                      },
                      {
                        _type: 'rootGraphFetchTree',
                        class: 'test::autoMapping::Firm',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'location',
                            subTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'name',
                            subTrees: [],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'rootGraphFetchTree',
                    class: 'test::autoMapping::Firm',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'location',
                        subTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'name',
                        subTrees: [],
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__Relational_Inline = [
  {
    path: 'Oct::models::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'Oct::models',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'Oct::models::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'Oct::models',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Oct::models::Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'Oct::stores::ChildStore',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [],
      name: 'ChildStore',
      package: 'Oct::stores',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'PERSONTABLE',
              primaryKey: [],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'Oct::stores::ParentStore',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: ['Oct::stores::ChildStore'],
      joins: [
        {
          name: 'FRIM_PERSON',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'Oct::stores::ParentStore',
                  mainTableDb: 'Oct::stores::ParentStore',
                  schema: 'default',
                  table: 'FIRMTABLE',
                },
                tableAlias: 'FIRMTABLE',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'Oct::stores::ParentStore',
                  mainTableDb: 'Oct::stores::ParentStore',
                  schema: 'default',
                  table: 'PERSONTABLE',
                },
                tableAlias: 'PERSONTABLE',
              },
            ],
          },
        },
        {
          name: 'FRIM_CEO',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'Oct::stores::ParentStore',
                  mainTableDb: 'Oct::stores::ParentStore',
                  schema: 'default',
                  table: 'FIRMTABLE',
                },
                tableAlias: 'FIRMTABLE',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'Oct::stores::ParentStore',
                  mainTableDb: 'Oct::stores::ParentStore',
                  schema: 'default',
                  table: 'PERSONTABLE',
                },
                tableAlias: 'PERSONTABLE',
              },
            ],
          },
        },
      ],
      name: 'ParentStore',
      package: 'Oct::stores',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
              ],
              name: 'FIRMTABLE',
              primaryKey: [],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'Oct::mappings::simpleRelationalMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'Oct::models::Firm',
          distinct: false,
          id: 'testInlineMapping',
          mainTable: {
            _type: 'Table',
            database: 'Oct::stores::ParentStore',
            mainTableDb: 'Oct::stores::ParentStore',
            schema: 'default',
            table: 'FIRMTABLE',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'Oct::models::Firm',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'Oct::stores::ParentStore',
                  mainTableDb: 'Oct::stores::ParentStore',
                  schema: 'default',
                  table: 'FIRMTABLE',
                },
                tableAlias: 'FIRMTABLE',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'Oct::models::Firm',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'Oct::stores::ParentStore',
                  mainTableDb: 'Oct::stores::ParentStore',
                  schema: 'default',
                  table: 'FIRMTABLE',
                },
                tableAlias: 'FIRMTABLE',
              },
            },
          ],
          root: true,
        },
        {
          _type: 'relational',
          class: 'Oct::models::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'Oct::stores::ParentStore',
            mainTableDb: 'Oct::stores::ParentStore',
            schema: 'default',
            table: 'PERSONTABLE',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'Oct::models::Person',
                property: 'fName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'Oct::stores::ChildStore',
                  mainTableDb: 'Oct::stores::ChildStore',
                  schema: 'default',
                  table: 'PERSONTABLE',
                },
                tableAlias: 'PERSONTABLE',
              },
            },
            {
              _type: 'inlineEmbeddedPropertyMapping',
              property: {
                class: 'Oct::models::Person',
                property: 'firm',
              },
              setImplementationId: 'testInlineMapping',
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'simpleRelationalMapping',
      package: 'Oct::mappings',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];
