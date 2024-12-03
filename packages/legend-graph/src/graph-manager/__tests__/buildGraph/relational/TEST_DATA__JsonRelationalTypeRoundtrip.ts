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

export const TEST_DATA__JsonRelationalTypeRoundtrip = [
  {
    path: 'joinChain::model::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'joinChain::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },

  {
    path: 'joinChain::model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'joinChain::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'manager',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'joinChain::model::Person',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'managerFirm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'joinChain::model::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'managerManagerFirm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'joinChain::model::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'managerManagerFirmDup1',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'joinChain::model::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'managerManagerFirmDup2',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'joinChain::model::Firm',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'joinChain::store::SnowflakeDB',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'manager1',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'MANAGERID',
                table: {
                  _type: 'Table',
                  database: 'joinChain::store::SnowflakeDB',
                  mainTableDb: 'joinChain::store::SnowflakeDB',
                  schema: 'PERSON_SCHEMA',
                  table: 'PERSON_TABLE',
                },
                tableAlias: 'PERSON_TABLE',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'joinChain::store::SnowflakeDB',
                  mainTableDb: 'joinChain::store::SnowflakeDB',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
              },
            ],
          },
        },
        {
          name: 'manager2',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'MANAGERID',
                table: {
                  _type: 'Table',
                  database: 'joinChain::store::SnowflakeDB',
                  mainTableDb: 'joinChain::store::SnowflakeDB',
                  schema: 'PERSON_SCHEMA',
                  table: 'PERSON_TABLE',
                },
                tableAlias: 'PERSON_TABLE',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'joinChain::store::SnowflakeDB',
                  mainTableDb: 'joinChain::store::SnowflakeDB',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
              },
            ],
          },
        },
      ],
      name: 'SnowflakeDB',
      package: 'joinChain::store',
      schemas: [
        {
          name: 'PERSON_SCHEMA',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'FIRM_DETAILS',
                  nullable: true,
                  type: {
                    _type: 'Json',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'PERSON_TABLE',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'joinChain::store::FirmBinding',
    content: {
      _type: 'binding',
      contentType: 'application/json',
      modelUnit: {
        packageableElementExcludes: [],
        packageableElementIncludes: ['joinChain::model::Firm'],
      },
      name: 'FirmBinding',
      package: 'joinChain::store',
    },
    classifierPath: 'meta::external::format::shared::binding::Binding',
  },
  {
    path: 'joinChain::mapping::SnowflakeMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'joinChain::model::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'joinChain::store::SnowflakeDB',
            mainTableDb: 'joinChain::store::SnowflakeDB',
            schema: 'PERSON_SCHEMA',
            table: 'PERSON_TABLE',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'joinChain::store::SnowflakeDB',
                mainTableDb: 'joinChain::store::SnowflakeDB',
                schema: 'PERSON_SCHEMA',
                table: 'PERSON_TABLE',
              },
              tableAlias: 'PERSON_TABLE',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'joinChain::model::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'joinChain::store::SnowflakeDB',
                  mainTableDb: 'joinChain::store::SnowflakeDB',
                  schema: 'PERSON_SCHEMA',
                  table: 'PERSON_TABLE',
                },
                tableAlias: 'PERSON_TABLE',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'joinChain::model::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'joinChain::store::SnowflakeDB',
                  mainTableDb: 'joinChain::store::SnowflakeDB',
                  schema: 'PERSON_SCHEMA',
                  table: 'PERSON_TABLE',
                },
                tableAlias: 'PERSON_TABLE',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              bindingTransformer: {
                binding: 'joinChain::store::FirmBinding',
              },
              property: {
                class: 'joinChain::model::Person',
                property: 'managerFirm',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'joinChain::store::SnowflakeDB',
                    name: 'manager1',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'FIRM_DETAILS',
                  table: {
                    _type: 'Table',
                    database: 'joinChain::store::SnowflakeDB',
                    mainTableDb: 'joinChain::store::SnowflakeDB',
                    schema: 'PERSON_SCHEMA',
                    table: 'PERSON_TABLE',
                  },
                  tableAlias: 'PERSON_TABLE',
                },
              },
            },
            {
              _type: 'relationalPropertyMapping',
              bindingTransformer: {
                binding: 'joinChain::store::FirmBinding',
              },
              property: {
                class: 'joinChain::model::Person',
                property: 'managerManagerFirm',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'joinChain::store::SnowflakeDB',
                    name: 'manager1',
                  },
                  {
                    db: 'joinChain::store::SnowflakeDB',
                    name: 'manager1',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'FIRM_DETAILS',
                  table: {
                    _type: 'Table',
                    database: 'joinChain::store::SnowflakeDB',
                    mainTableDb: 'joinChain::store::SnowflakeDB',
                    schema: 'PERSON_SCHEMA',
                    table: 'PERSON_TABLE',
                  },
                  tableAlias: 'PERSON_TABLE',
                },
              },
            },
            {
              _type: 'relationalPropertyMapping',
              bindingTransformer: {
                binding: 'joinChain::store::FirmBinding',
              },
              property: {
                class: 'joinChain::model::Person',
                property: 'managerManagerFirmDup1',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'joinChain::store::SnowflakeDB',
                    name: 'manager1',
                  },
                  {
                    db: 'joinChain::store::SnowflakeDB',
                    name: 'manager2',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'FIRM_DETAILS',
                  table: {
                    _type: 'Table',
                    database: 'joinChain::store::SnowflakeDB',
                    mainTableDb: 'joinChain::store::SnowflakeDB',
                    schema: 'PERSON_SCHEMA',
                    table: 'PERSON_TABLE',
                  },
                  tableAlias: 'PERSON_TABLE',
                },
              },
            },
            {
              _type: 'relationalPropertyMapping',
              bindingTransformer: {
                binding: 'joinChain::store::FirmBinding',
              },
              property: {
                class: 'joinChain::model::Person',
                property: 'managerManagerFirmDup2',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'joinChain::store::SnowflakeDB',
                    name: 'manager2',
                  },
                  {
                    db: 'joinChain::store::SnowflakeDB',
                    name: 'manager2',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'FIRM_DETAILS',
                  table: {
                    _type: 'Table',
                    database: 'joinChain::store::SnowflakeDB',
                    mainTableDb: 'joinChain::store::SnowflakeDB',
                    schema: 'PERSON_SCHEMA',
                    table: 'PERSON_TABLE',
                  },
                  tableAlias: 'PERSON_TABLE',
                },
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'joinChain::model::Person',
                property: 'manager',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'joinChain::store::SnowflakeDB',
                    name: 'manager1',
                  },
                ],
              },
              target: 'joinChain_model_Person',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'SnowflakeMapping',
      package: 'joinChain::mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];
