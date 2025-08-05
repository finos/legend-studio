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

export const TEST_DATA_SimpleSnowflakeArtifact = {
  _type: 'testArtifact',
  actions: [],
  content: {
    _type: 'testContent',
    applicationName: 'testFunction',
    createStatement:
      'CREATE OR REPLACE SECURE FUNCTION xyz RETURNS TABLE ("ID" VARCHAR,"VALUE" INTEGER) LANGUAGE SQL AS $$ select * from Test.Test as "root" $$;',
    creationTime: '2025-07-31 16:01:57',
    deploymentSchema: 'testSchema',
    description: 'This is a test',
    ownership: '123',
    permissionScope: 'DEFAULT',
    sqlExpressions: [],
    usedTables: ['Test.Test'],
  },
  deployedLocation: 'testLocation',
  deploymentConfiguration: {
    _type: 'testType',
    connection: {
      _type: 'testConnectionType',
      authenticationStrategy: {
        _type: 'testAuth',
        oauthKey: 'testOauth',
        scopeName: 'testScope',
      },
      databaseType: 'testDatabaseType',
      datasourceSpecification: {
        _type: 'testType',
        accountName: 'testAccountName',
        databaseName: 'testDatabaseName',
        region: 'testRegion',
        warehouseName: 'testWarehouse',
      },
      element: 'demo::stores::TestDatabase',
      postProcessorWithParameter: [],
      postProcessors: [],
      type: 'testType',
    },
  },
};
