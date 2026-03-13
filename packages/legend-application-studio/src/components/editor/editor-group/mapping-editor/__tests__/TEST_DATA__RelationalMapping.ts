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

export const TEST_DATA__RelationalMapping = [
  {
    path: 'models::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'models',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'models::PromotableWorker',
    content: {
      _type: 'class',
      name: 'PromotableWorker',
      package: 'models',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 1,
          },
          name: 'available_promotion_titles',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'models::Income',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'income',
        },
      ],
      superTypes: [
        {
          path: 'models::Person',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'models::Income',
    content: {
      _type: 'class',
      name: 'Income',
      package: 'models',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Int',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'salary',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Int',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'tax',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'stores::SimpleDB',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'SimpleDB',
      package: 'stores',
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
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'People',
              primaryKey: ['id'],
            },
            {
              columns: [
                {
                  name: 'title',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 50,
                  },
                },
                {
                  name: 'salary',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'tax',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'Promotions',
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
    path: 'mapping::SimpleInheritanceMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'models::Person',
          distinct: false,
          id: 'basePerson',
          mainTable: {
            _type: 'Table',
            database: 'stores::SimpleDB',
            mainTableDb: 'stores::SimpleDB',
            schema: 'default',
            table: 'People',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'stores::SimpleDB',
                mainTableDb: 'stores::SimpleDB',
                schema: 'default',
                table: 'People',
              },
              tableAlias: 'People',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'models::Person',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'stores::SimpleDB',
                  mainTableDb: 'stores::SimpleDB',
                  schema: 'default',
                  table: 'People',
                },
                tableAlias: 'People',
              },
              source: 'basePerson',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'models::PromotableWorker',
          distinct: false,
          extendsClassMappingId: 'basePerson',
          id: 'promotableWorker',
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'models::PromotableWorker',
                property: 'available_promotion_titles',
              },
              relationalOperation: {
                _type: 'column',
                column: 'title',
                table: {
                  _type: 'Table',
                  database: 'stores::SimpleDB',
                  mainTableDb: 'stores::SimpleDB',
                  schema: 'default',
                  table: 'Promotions',
                },
                tableAlias: 'Promotions',
              },
              source: 'promotableWorker',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'models::Income',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'stores::SimpleDB',
            mainTableDb: 'stores::SimpleDB',
            schema: 'default',
            table: 'Promotions',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'models::Income',
                property: 'salary',
              },
              relationalOperation: {
                _type: 'column',
                column: 'salary',
                table: {
                  _type: 'Table',
                  database: 'stores::SimpleDB',
                  mainTableDb: 'stores::SimpleDB',
                  schema: 'default',
                  table: 'Promotions',
                },
                tableAlias: 'Promotions',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'models::Income',
                property: 'tax',
              },
              relationalOperation: {
                _type: 'column',
                column: 'tax',
                table: {
                  _type: 'Table',
                  database: 'stores::SimpleDB',
                  mainTableDb: 'stores::SimpleDB',
                  schema: 'default',
                  table: 'Promotions',
                },
                tableAlias: 'Promotions',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'SimpleInheritanceMapping',
      package: 'mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];
