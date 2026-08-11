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

/**
 * Mock responses for Legend Engine endpoints, captured from a live engine
 * instance. These are served to the browser via Playwright network
 * interception (see `EngineMock.ts`) so tests do not require a running
 * engine backend.
 */

export const TEST_DATA__CurrentUser = 'anonymous';

export const TEST_DATA__ClassifierPathMap = [
  {
    type: 'dataQualityValidation',
    classifierPath: 'meta::external::dataquality::DataQuality',
  },
  {
    type: 'dataqualityRelationValidation',
    classifierPath:
      'meta::external::dataquality::DataQualityRelationValidation',
  },
  {
    type: 'MongoDatabase',
    classifierPath:
      'meta::external::store::mongodb::metamodel::pure::MongoDatabase',
  },
  {
    type: 'measure',
    classifierPath: 'meta::pure::metamodel::type::Measure',
  },
  {
    type: 'generationSpecification',
    classifierPath:
      'meta::pure::generation::metamodel::GenerationSpecification',
  },
  {
    type: 'relationalMapper',
    classifierPath: 'meta::relational::metamodel::RelationalMapper',
  },
  {
    type: 'externalFormatSchemaSet',
    classifierPath: 'meta::external::format::shared::metamodel::SchemaSet',
  },
  {
    type: 'function',
    classifierPath:
      'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  },
  {
    type: 'elasticsearch7Store',
    classifierPath:
      'meta::external::store::elasticsearch::v7::metamodel::store::Elasticsearch7Store',
  },
  {
    type: 'serviceStore',
    classifierPath: 'meta::external::store::service::metamodel::ServiceStore',
  },
  {
    type: 'profile',
    classifierPath: 'meta::pure::metamodel::extension::Profile',
  },
  {
    type: 'functionJar',
    classifierPath:
      'meta::external::function::activator::functionJar::FunctionJar',
  },
  {
    type: 'text',
    classifierPath: 'meta::pure::metamodel::text::Text',
  },
  {
    type: 'snowflakeApp',
    classifierPath:
      'meta::external::function::activator::snowflakeApp::SnowflakeApp',
  },
  {
    type: 'association',
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    type: 'hostedService',
    classifierPath:
      'meta::external::function::activator::hostedService::HostedService',
  },
  {
    type: 'bigQueryFunction',
    classifierPath:
      'meta::external::function::activator::bigQueryFunction::BigQueryFunction',
  },
  {
    type: 'persistence',
    classifierPath: 'meta::pure::persistence::metamodel::Persistence',
  },
  {
    type: 'class',
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    type: 'Enumeration',
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    type: 'dataSpace',
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  },
  {
    type: 'persistenceContext',
    classifierPath: 'meta::pure::persistence::metamodel::PersistenceContext',
  },
  {
    type: 'fileGeneration',
    classifierPath:
      'meta::pure::generation::metamodel::GenerationConfiguration',
  },
  {
    type: 'sectionIndex',
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    type: 'relational',
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    type: 'service',
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    type: 'binding',
    classifierPath: 'meta::external::format::shared::binding::Binding',
  },
  {
    type: 'diagram',
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
  },
  {
    type: 'executionEnvironmentInstance',
    classifierPath:
      'meta::legend::service::metamodel::ExecutionEnvironmentInstance',
  },
];

export const TEST_DATA__SubtypeInfo = {
  functionActivatorSubtypes: [
    'functionJar',
    'memSqlFunction',
    'snowflakeApp',
    'hostedService',
    'bigQueryFunction',
    'snowflakeM2MUdf',
  ],
  storeSubtypes: [
    'MongoDatabase',
    'serviceStore',
    'relational',
    'elasticsearch7Store',
  ],
};

/**
 * A light query as returned by the engine query search endpoint. The GAV
 * coordinates match the mock project served by the mock depot server
 * (see `@finos/legend-fixture-mock-server`).
 */
export const TEST_DATA__LightQueries = [
  {
    name: 'MockTestQuery',
    id: 'mock-test-query-id',
    groupId: 'org.finos.legend.test',
    artifactId: 'legend-query-test',
    versionId: '0.0.1',
    originalVersionId: '0.0.1',
    owner: 'anonymous',
    createdAt: 1700000000000,
    lastUpdatedAt: 1700000000000,
    lastOpenAt: 1700000000000,
  },
];

/**
 * A TDS execution result for a query projecting all properties of
 * `test::COVIDData` (the class from the mock depot project), as returned by
 * the engine execute endpoint.
 */
export const TEST_DATA__ExecutionResult = {
  builder: {
    _type: 'tdsBuilder',
    columns: [
      { name: 'Cases', type: 'Float', relationalType: 'DOUBLE' },
      { name: 'Case Type', type: 'String', relationalType: 'VARCHAR(200)' },
      { name: 'Date', type: 'StrictDate', relationalType: 'DATE' },
      { name: 'Fips', type: 'String', relationalType: 'VARCHAR(200)' },
      { name: 'Id', type: 'Integer', relationalType: 'INTEGER' },
      { name: 'Last Reported Flag', type: 'Boolean', relationalType: 'BIT' },
    ],
  },
  activities: [
    {
      _type: 'relational',
      sql: 'select "root".CASES as "Cases", "root".CASE_TYPE as "Case Type", "root".DATE as "Date", "root".FIPS as "Fips", "root".ID as "Id", "root".LAST_REPORTED_FLAG as "Last Reported Flag" from COVID_DATA as "root"',
    },
  ],
  result: {
    columns: ['Cases', 'Case Type', 'Date', 'Fips', 'Id', 'Last Reported Flag'],
    rows: [
      { values: [250, 'Confirmed', '2021-04-01', '00001', 1, true] },
      { values: [301, 'Confirmed', '2021-04-02', '00002', 2, false] },
    ],
  },
};
