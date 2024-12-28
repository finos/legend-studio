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

export const DATA_SPACE_STORED_ENTITIES = [
  {
    groupId: 'org.finos.legend.test',
    artifactId: 'legend-query-test',
    versionId: '0.0.1',
    entity: {
      path: 'test::DataSpace',
      content: {
        _type: 'dataSpace',
        defaultExecutionContext: 'dummyContext',
        executionContexts: [
          {
            defaultRuntime: {
              path: 'test::H2Runtime',
              type: 'RUNTIME',
            },
            mapping: {
              path: 'test::CovidDataMapping',
              type: 'MAPPING',
            },
            name: 'dummyContext',
            title: 'Dummy Context',
          },
        ],
        name: 'DataSpace',
        package: 'test',
        title: 'Test DataSpace',
      },
      classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
    },
  },
];

export const PROJECT_DATA = {
  groupId: 'org.finos.legend.test',
  artifactId: 'legend-query-test',
  versionId: '0.0.1',
};

export const DATA_SPACE_ANALYTICS_FILE_CONTENT = {
  defaultExecutionContext: 'dummyContext',
  diagrams: [],
  elementDocs: [],
  elements: [],
  executables: [],
  executionContexts: [
    {
      compatibleRuntimes: ['test::H2Runtime'],
      datasets: [
        {
          _type: 'relationalDatabaseTable',
          database: 'CovidDataStore',
          name: 'default.DEMOGRAPHICS',
          schema: 'default',
          table: 'DEMOGRAPHICS',
          type: 'H2',
        },
        {
          _type: 'relationalDatabaseTable',
          database: 'CovidDataStore',
          name: 'default.COVID_DATA',
          schema: 'default',
          table: 'COVID_DATA',
          type: 'H2',
        },
      ],
      defaultRuntime: 'test::H2Runtime',
      mapping: 'test::CovidDataMapping',
      name: 'dummyContext',
      runtimeMetadata: {
        connectionPath: 'test::connection::H2Connection',
        connectionType: 'H2',
        storePath: 'test::CovidDataStore',
      },
      title: 'Dummy Context',
    },
  ],
  mappingToMappingCoverageResult: {
    'test::CovidDataMapping': {
      mappedEntities: [
        {
          path: 'test::COVIDData',
          properties: [
            {
              _type: 'MappedProperty',
              name: 'caseType',
            },
            {
              _type: 'MappedProperty',
              name: 'cases',
            },
            {
              _type: 'MappedProperty',
              name: 'date',
            },
            {
              _type: 'MappedProperty',
              name: 'fips',
            },
            {
              _type: 'MappedProperty',
              name: 'id',
            },
            {
              _type: 'MappedProperty',
              name: 'lastReportedFlag',
            },
          ],
        },
        {
          path: 'test::Demographics',
          properties: [
            {
              _type: 'MappedProperty',
              name: 'fips',
            },
            {
              _type: 'MappedProperty',
              name: 'state',
            },
          ],
        },
      ],
    },
  },
  model: {
    _type: 'data',
    elements: [],
  },
  name: 'DataSpace',
  package: 'test',
  path: 'test::DataSpace',
  stereotypes: [],
  taggedValues: [],
  title: 'Test DataSpace',
};

export const ENTITIES = [
  {
    path: 'test::COVIDData',
    content: {
      _type: 'class',
      name: 'COVIDData',
      package: 'test',
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
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'fips',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'date',
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
          name: 'caseType',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'cases',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'lastReportedFlag',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Demographics',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'demographics',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Demographics',
    content: {
      _type: 'class',
      name: 'Demographics',
      package: 'test',
      properties: [
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
          name: 'fips',
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
          name: 'state',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::CovidDataStore',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'CovidDataDemographicsJoin',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
              {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            ],
          },
        },
      ],
      name: 'CovidDataStore',
      package: 'test',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'FIPS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'STATE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'DEMOGRAPHICS',
              primaryKey: [],
            },
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
                  name: 'FIPS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'DATE',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'CASE_TYPE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'CASES',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LAST_REPORTED_FLAG',
                  nullable: true,
                  type: {
                    _type: 'Bit',
                  },
                },
              ],
              name: 'COVID_DATA',
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
    path: 'test::CovidDataMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'test::Demographics',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'test::CovidDataStore',
            mainTableDb: 'test::CovidDataStore',
            schema: 'default',
            table: 'DEMOGRAPHICS',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'FIPS',
              table: {
                _type: 'Table',
                database: 'test::CovidDataStore',
                mainTableDb: 'test::CovidDataStore',
                schema: 'default',
                table: 'DEMOGRAPHICS',
              },
              tableAlias: 'DEMOGRAPHICS',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Demographics',
                property: 'fips',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Demographics',
                property: 'state',
              },
              relationalOperation: {
                _type: 'column',
                column: 'STATE',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'test::COVIDData',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'test::CovidDataStore',
            mainTableDb: 'test::CovidDataStore',
            schema: 'default',
            table: 'COVID_DATA',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'test::CovidDataStore',
                mainTableDb: 'test::CovidDataStore',
                schema: 'default',
                table: 'COVID_DATA',
              },
              tableAlias: 'COVID_DATA',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'fips',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'DATE',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'caseType',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CASE_TYPE',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'cases',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CASES',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'lastReportedFlag',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LAST_REPORTED_FLAG',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'demographics',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'test::CovidDataStore',
                    name: 'CovidDataDemographicsJoin',
                  },
                ],
              },
              target: 'domain_Demographics',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'CovidDataMapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::H2Runtime',
    content: {
      _type: 'runtime',
      name: 'H2Runtime',
      package: 'test',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'test::CovidDataStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'test::connection::H2Connection',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'test::CovidDataMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'test::connection::H2Connection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'h2Local',
          testDataSetupSqls: [
            "DROP TABLE IF EXISTS COVID_DATA;\nDROP TABLE IF EXISTS DEMOGRAPHICS;\n\nCREATE TABLE DEMOGRAPHICS(\n  FIPS VARCHAR(200) PRIMARY KEY,\n  STATE VARCHAR(200)\n);\n\nCREATE TABLE COVID_DATA(\n  ID INT PRIMARY KEY,\n  FIPS VARCHAR(200),\n  DATE DATE,\n  CASE_TYPE VARCHAR(200),\n  CASES INT,\n  LAST_REPORTED_FLAG BIT,\n  FOREIGN KEY (FIPS) REFERENCES DEMOGRAPHICS(FIPS)\n);\n\nINSERT INTO DEMOGRAPHICS VALUES('1', 'NY');\nINSERT INTO DEMOGRAPHICS VALUES('2', 'NJ');\nINSERT INTO DEMOGRAPHICS VALUES('3', 'CA');\n\nINSERT INTO COVID_DATA VALUES(1, '1', '2021-04-01', 'Confirmed', 405, 0);\nINSERT INTO COVID_DATA VALUES(2, '2', '2021-04-01', 'Active', 290, 1);\n",
          ],
        },
        element: 'test::CovidDataStore',
        type: 'H2',
      },
      name: 'H2Connection',
      package: 'test::connection',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'test::DataSpace',
    content: {
      _type: 'dataSpace',
      defaultExecutionContext: 'dummyContext',
      executionContexts: [
        {
          defaultRuntime: {
            path: 'test::H2Runtime',
            type: 'RUNTIME',
          },
          mapping: {
            path: 'test::CovidDataMapping',
            type: 'MAPPING',
          },
          name: 'dummyContext',
          title: 'Dummy Context',
        },
      ],
      name: 'DataSpace',
      package: 'test',
      title: 'Test DataSpace',
    },
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  },
];

export const PMCD = {
  _type: 'data',
  serializer: {
    name: 'pure',
    version: 'vX_X_X',
  },
  origin: {
    _type: 'pointer',
    sdlcInfo: {
      _type: 'alloy',
      baseVersion: '0.0.1',
      groupId: 'org.finos.legend.test',
      artifactId: 'legend-query-test',
    },
  },
  elements: [
    {
      _type: 'class',
      name: 'COVIDData',
      package: 'test',
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
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'fips',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'date',
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
          name: 'caseType',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'cases',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'lastReportedFlag',
        },
        {
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Demographics',
            },
          },
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'demographics',
        },
      ],
    },
    {
      _type: 'class',
      name: 'Demographics',
      package: 'test',
      properties: [
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
          name: 'fips',
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
          name: 'state',
        },
      ],
    },
    {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'CovidDataDemographicsJoin',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
              {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            ],
          },
        },
      ],
      name: 'CovidDataStore',
      package: 'test',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'FIPS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'STATE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'DEMOGRAPHICS',
              primaryKey: [],
            },
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
                  name: 'FIPS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'DATE',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'CASE_TYPE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'CASES',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LAST_REPORTED_FLAG',
                  nullable: true,
                  type: {
                    _type: 'Bit',
                  },
                },
              ],
              name: 'COVID_DATA',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
    },
    {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'test::Demographics',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'test::CovidDataStore',
            mainTableDb: 'test::CovidDataStore',
            schema: 'default',
            table: 'DEMOGRAPHICS',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'FIPS',
              table: {
                _type: 'Table',
                database: 'test::CovidDataStore',
                mainTableDb: 'test::CovidDataStore',
                schema: 'default',
                table: 'DEMOGRAPHICS',
              },
              tableAlias: 'DEMOGRAPHICS',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Demographics',
                property: 'fips',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::Demographics',
                property: 'state',
              },
              relationalOperation: {
                _type: 'column',
                column: 'STATE',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'DEMOGRAPHICS',
                },
                tableAlias: 'DEMOGRAPHICS',
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'test::COVIDData',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'test::CovidDataStore',
            mainTableDb: 'test::CovidDataStore',
            schema: 'default',
            table: 'COVID_DATA',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'test::CovidDataStore',
                mainTableDb: 'test::CovidDataStore',
                schema: 'default',
                table: 'COVID_DATA',
              },
              tableAlias: 'COVID_DATA',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'fips',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIPS',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'DATE',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'caseType',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CASE_TYPE',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'cases',
              },
              relationalOperation: {
                _type: 'column',
                column: 'CASES',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'lastReportedFlag',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LAST_REPORTED_FLAG',
                table: {
                  _type: 'Table',
                  database: 'test::CovidDataStore',
                  mainTableDb: 'test::CovidDataStore',
                  schema: 'default',
                  table: 'COVID_DATA',
                },
                tableAlias: 'COVID_DATA',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'test::COVIDData',
                property: 'demographics',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'test::CovidDataStore',
                    name: 'CovidDataDemographicsJoin',
                  },
                ],
              },
              target: 'domain_Demographics',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'CovidDataMapping',
      package: 'test',
      tests: [],
    },
    {
      _type: 'runtime',
      name: 'H2Runtime',
      package: 'test',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'test::CovidDataStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'test::connection::H2Connection',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'test::CovidDataMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'h2Local',
          testDataSetupSqls: [
            "DROP TABLE IF EXISTS COVID_DATA;\nDROP TABLE IF EXISTS DEMOGRAPHICS;\n\nCREATE TABLE DEMOGRAPHICS(\n  FIPS VARCHAR(200) PRIMARY KEY,\n  STATE VARCHAR(200)\n);\n\nCREATE TABLE COVID_DATA(\n  ID INT PRIMARY KEY,\n  FIPS VARCHAR(200),\n  DATE DATE,\n  CASE_TYPE VARCHAR(200),\n  CASES INT,\n  LAST_REPORTED_FLAG BIT,\n  FOREIGN KEY (FIPS) REFERENCES DEMOGRAPHICS(FIPS)\n);\n\nINSERT INTO DEMOGRAPHICS VALUES('1', 'NY');\nINSERT INTO DEMOGRAPHICS VALUES('2', 'NJ');\nINSERT INTO DEMOGRAPHICS VALUES('3', 'CA');\n\nINSERT INTO COVID_DATA VALUES(1, '1', '2021-04-01', 'Confirmed', 405, 0);\nINSERT INTO COVID_DATA VALUES(2, '2', '2021-04-01', 'Active', 290, 1);\n",
          ],
        },
        element: 'test::CovidDataStore',
        type: 'H2',
      },
      name: 'H2Connection',
      package: 'test::connection',
    },
    {
      _type: 'dataSpace',
      defaultExecutionContext: 'dummyContext',
      executionContexts: [
        {
          defaultRuntime: {
            path: 'test::H2Runtime',
            type: 'RUNTIME',
          },
          mapping: {
            path: 'test::CovidDataMapping',
            type: 'MAPPING',
          },
          name: 'dummyContext',
          title: 'Dummy Context',
        },
      ],
      name: 'DataSpace',
      package: 'test',
      title: 'Test DataSpace',
    },
  ],
};
