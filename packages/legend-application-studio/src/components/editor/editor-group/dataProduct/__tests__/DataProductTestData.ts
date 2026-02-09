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

export const TEST_DATA__DataProduct_NativeModelAccess = [
  {
    path: 'showcase::northwind::model::crm::Customer',
    content: {
      _type: 'class',
      name: 'Customer',
      package: 'showcase::northwind::model::crm',
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
          name: 'id',
        },
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
          name: 'companyName',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'contactName',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'companyTitle',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'telephoneNumber',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'faxNumber',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'showcase::northwind::model::inventory::ProductCategory',
    content: {
      _type: 'class',
      name: 'ProductCategory',
      package: 'showcase::northwind::model::inventory',
      properties: [
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
        },
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
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'description',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'showcase::northwind::store::NorthwindDatabase',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'NorthwindDatabase',
      package: 'showcase::northwind::store',
      schemas: [
        {
          name: 'NORTHWIND',
          tables: [
            {
              columns: [
                {
                  name: 'CATEGORY_ID',
                  nullable: false,
                  type: {
                    _type: 'SmallInt',
                  },
                },
                {
                  name: 'CATEGORY_NAME',
                  nullable: false,
                  type: {
                    _type: 'Varchar',
                    size: 15,
                  },
                },
                {
                  name: 'DESCRIPTION',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 256,
                  },
                },
                {
                  name: 'PICTURE',
                  nullable: true,
                  type: {
                    _type: 'Other',
                  },
                },
              ],
              name: 'CATEGORIES',
              primaryKey: ['CATEGORY_ID'],
            },
            {
              columns: [
                {
                  name: 'CUSTOMER_ID',
                  nullable: false,
                  type: {
                    _type: 'Varchar',
                    size: 5,
                  },
                },
                {
                  name: 'COMPANY_NAME',
                  nullable: false,
                  type: {
                    _type: 'Varchar',
                    size: 40,
                  },
                },
                {
                  name: 'CONTACT_NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 30,
                  },
                },
                {
                  name: 'CONTACT_TITLE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 30,
                  },
                },
                {
                  name: 'ADDRESS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 60,
                  },
                },
                {
                  name: 'CITY',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 15,
                  },
                },
                {
                  name: 'REGION',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 15,
                  },
                },
                {
                  name: 'POSTAL_CODE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
                {
                  name: 'COUNTRY',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 15,
                  },
                },
                {
                  name: 'PHONE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 24,
                  },
                },
                {
                  name: 'FAX',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 24,
                  },
                },
              ],
              name: 'CUSTOMERS',
              primaryKey: ['CUSTOMER_ID'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'showcase::northwind::mapping::CategoryMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'showcase::northwind::model::inventory::ProductCategory',
          distinct: false,
          id: 'Category',
          mainTable: {
            _type: 'Table',
            database: 'showcase::northwind::store::NorthwindDatabase',
            mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
            schema: 'NORTHWIND',
            table: 'CATEGORIES',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'CATEGORY_ID',
              table: {
                _type: 'Table',
                database: 'showcase::northwind::store::NorthwindDatabase',
                mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                schema: 'NORTHWIND',
                table: 'CATEGORIES',
              },
              tableAlias: 'CATEGORIES',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::inventory::ProductCategory',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CATEGORY_ID',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CATEGORIES',
                },
                tableAlias: 'CATEGORIES',
              },
              source: 'Category',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::inventory::ProductCategory',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CATEGORY_NAME',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CATEGORIES',
                },
                tableAlias: 'CATEGORIES',
              },
              source: 'Category',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::inventory::ProductCategory',
                property: 'description',
              },
              relationalOperation: {
                _type: 'column',
                column: 'DESCRIPTION',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CATEGORIES',
                },
                tableAlias: 'CATEGORIES',
              },
              source: 'Category',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'CategoryMapping',
      package: 'showcase::northwind::mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'showcase::northwind::mapping::CustomerMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'showcase::northwind::model::crm::Customer',
          distinct: false,
          id: 'Customer',
          mainTable: {
            _type: 'Table',
            database: 'showcase::northwind::store::NorthwindDatabase',
            mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
            schema: 'NORTHWIND',
            table: 'CUSTOMERS',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'CUSTOMER_ID',
              table: {
                _type: 'Table',
                database: 'showcase::northwind::store::NorthwindDatabase',
                mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                schema: 'NORTHWIND',
                table: 'CUSTOMERS',
              },
              tableAlias: 'CUSTOMERS',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::crm::Customer',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CUSTOMER_ID',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CUSTOMERS',
                },
                tableAlias: 'CUSTOMERS',
              },
              source: 'Customer',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::crm::Customer',
                property: 'companyName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'COMPANY_NAME',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CUSTOMERS',
                },
                tableAlias: 'CUSTOMERS',
              },
              source: 'Customer',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::crm::Customer',
                property: 'contactName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CONTACT_NAME',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CUSTOMERS',
                },
                tableAlias: 'CUSTOMERS',
              },
              source: 'Customer',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::crm::Customer',
                property: 'companyTitle',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CONTACT_TITLE',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CUSTOMERS',
                },
                tableAlias: 'CUSTOMERS',
              },
              source: 'Customer',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::crm::Customer',
                property: 'telephoneNumber',
              },
              relationalOperation: {
                _type: 'column',
                column: 'PHONE',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CUSTOMERS',
                },
                tableAlias: 'CUSTOMERS',
              },
              source: 'Customer',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'showcase::northwind::model::crm::Customer',
                property: 'faxNumber',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FAX',
                table: {
                  _type: 'Table',
                  database: 'showcase::northwind::store::NorthwindDatabase',
                  mainTableDb: 'showcase::northwind::store::NorthwindDatabase',
                  schema: 'NORTHWIND',
                  table: 'CUSTOMERS',
                },
                tableAlias: 'CUSTOMERS',
              },
              source: 'Customer',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'CustomerMapping',
      package: 'showcase::northwind::mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'showcase::northwind::runtime::NorthwindRuntime',
    content: {
      _type: 'runtime',
      name: 'NorthwindRuntime',
      package: 'showcase::northwind::runtime',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'showcase::northwind::store::NorthwindDatabase',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'RelationalDatabaseConnection',
                  authenticationStrategy: {
                    _type: 'h2Default',
                  },
                  databaseType: 'H2',
                  datasourceSpecification: {
                    _type: 'h2Local',
                    testDataSetupSqls: ['call loadNorthwindData()'],
                  },
                  element: 'showcase::northwind::store::NorthwindDatabase',
                  type: 'H2',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'showcase::northwind::mapping::CustomerMapping',
            type: 'MAPPING',
          },
          {
            path: 'showcase::northwind::mapping::CategoryMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'showcase::northwind::dataProduct::NorthwindDataProduct',
    content: {
      _type: 'dataProduct',
      description:
        'Migrated using studio converter from dataspace: showcase::northwind::dataspace::NorthwindDataSpace',
      name: 'NorthwindDataProduct',
      nativeModelAccess: {
        defaultExecutionContext: 'customer',
        nativeModelExecutionContexts: [
          {
            key: 'customer',
            mapping: {
              path: 'showcase::northwind::mapping::CustomerMapping',
            },
            runtime: {
              path: 'showcase::northwind::runtime::NorthwindRuntime',
            },
          },
          {
            key: 'category',
            mapping: {
              path: 'showcase::northwind::mapping::CategoryMapping',
            },
            runtime: {
              path: 'showcase::northwind::runtime::NorthwindRuntime',
            },
          },
        ],
      },
      package: 'showcase::northwind::dataProduct',
      title: 'DataProduct Auto Generated title: Please update',
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
];
