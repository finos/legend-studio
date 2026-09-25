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
 * The `test::COVIDData` instances the engine mock queries run against (see
 * `MockExecution.ts`), including the properties `mockEnrichedModel()` adds
 * (`reportStatus`, and `demographics`, which the explorer otherwise hides).
 *
 * `Case Type` intentionally repeats a few distinct values so grid
 * interactions like `Filter By`/`Filter Out` (including multi-value `in`
 * filters) have meaningful data to work against.
 */
export const TEST_DATA__COVIDData = [
  {
    id: 1,
    fips: '00001',
    date: '2021-04-01',
    caseType: 'Confirmed',
    cases: 250,
    lastReportedFlag: true,
    reportStatus: 'Final',
    demographics: { fips: '00001', state: 'NY' },
  },
  {
    id: 2,
    fips: '00002',
    date: '2021-04-02',
    caseType: 'Confirmed',
    cases: 301,
    lastReportedFlag: false,
    reportStatus: 'Final',
    demographics: { fips: '00002', state: 'NJ' },
  },
  {
    id: 3,
    fips: '00003',
    date: '2021-04-03',
    caseType: 'Active',
    cases: 180,
    lastReportedFlag: true,
    reportStatus: 'Preliminary',
    demographics: { fips: '00003', state: 'CA' },
  },
  {
    id: 4,
    fips: '00004',
    date: '2021-04-04',
    caseType: 'Death',
    cases: 420,
    lastReportedFlag: false,
    reportStatus: 'Revised',
    demographics: { fips: '00004', state: 'NY' },
  },
  {
    id: 5,
    fips: '00005',
    date: '2021-04-05',
    caseType: 'Active',
    cases: 95,
    lastReportedFlag: true,
    reportStatus: 'Preliminary',
    demographics: { fips: '00005', state: 'TX' },
  },
  {
    id: 6,
    fips: '00006',
    date: '2021-04-06',
    caseType: 'Confirmed',
    cases: 512,
    lastReportedFlag: false,
    reportStatus: 'Final',
    demographics: { fips: '00006', state: 'NJ' },
  },
  {
    id: 7,
    fips: '00007',
    date: '2021-04-07',
    caseType: 'Death',
    cases: 77,
    lastReportedFlag: true,
    reportStatus: 'Final',
    demographics: { fips: '00007', state: 'CA' },
  },
  {
    id: 8,
    fips: '00008',
    date: '2021-04-08',
    caseType: 'Confirmed',
    cases: 640,
    lastReportedFlag: false,
    reportStatus: 'Revised',
    demographics: { fips: '00008', state: 'NY' },
  },
];

/**
 * The Pure type of each (possibly nested) `test::COVIDData` property, keyed
 * by its dotted path, used to type projected result columns.
 */
export const TEST_DATA__COVIDDataPropertyTypes: Record<string, string> = {
  id: 'Integer',
  fips: 'String',
  date: 'StrictDate',
  caseType: 'String',
  cases: 'Float',
  lastReportedFlag: 'Boolean',
  reportStatus: 'test::ReportStatus',
  'demographics.fips': 'String',
  'demographics.state': 'String',
};

/**
 * A TDS execution result for a query projecting all properties of
 * `test::COVIDData` (the class from the mock depot project), as returned by
 * the engine execute endpoint.
 *
 * The engine mock evaluates the queries it understands against
 * {@link TEST_DATA__COVIDData}; this canned result answers any other query.
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
    rows: TEST_DATA__COVIDData.map((instance) => ({
      values: [
        instance.cases,
        instance.caseType,
        instance.date,
        instance.fips,
        instance.id,
        instance.lastReportedFlag,
      ],
    })),
  },
};

/** Row count of {@link TEST_DATA__ExecutionResult}. */
export const TEST_DATA__EXECUTION_RESULT_ROW_COUNT =
  TEST_DATA__COVIDData.length;

/**
 * The engine's mapping model coverage analysis of `test::CovidDataMapping`,
 * which the query builder uses to tell mapped properties from unmapped ones
 * when a query is built on a mapping (rather than a data space, whose
 * analytics carry their own coverage).
 */
export const TEST_DATA__MappingModelCoverage = {
  mappedEntities: [
    {
      path: 'test::COVIDData',
      properties: [
        { _type: 'MappedProperty', name: 'caseType' },
        { _type: 'MappedProperty', name: 'cases' },
        { _type: 'MappedProperty', name: 'date' },
        { _type: 'MappedProperty', name: 'fips' },
        { _type: 'MappedProperty', name: 'id' },
        { _type: 'MappedProperty', name: 'lastReportedFlag' },
        {
          _type: 'entity',
          name: 'demographics',
          entityPath: 'test::Demographics',
        },
      ],
    },
    {
      path: 'test::Demographics',
      properties: [
        { _type: 'MappedProperty', name: 'fips' },
        { _type: 'MappedProperty', name: 'state' },
      ],
    },
  ],
};

/** Data queried as a relation: its columns (with their Pure types) and rows. */
export interface TEST_DATA__Relation {
  columns: Record<string, string>;
  rows: Record<string, string | number | boolean | null>[];
}

/**
 * The data behind the `confirmed_cases` Lakehouse access point of
 * `test::CovidDataProduct`: the confirmed cases of the COVID data, as a view.
 */
export const TEST_DATA__ConfirmedCasesAccessPoint: TEST_DATA__Relation = {
  columns: { CASE_TYPE: 'String', CASES: 'Float', DATE: 'StrictDate' },
  rows: TEST_DATA__COVIDData.filter(
    (instance) => instance.caseType === 'Confirmed',
  ).map((instance) => ({
    CASE_TYPE: instance.caseType,
    CASES: instance.cases,
    DATE: instance.date,
  })),
};

/**
 * The data behind the `death_cases` Lakehouse access point of
 * `test::CovidDataProduct`: the deaths of the COVID data.
 */
export const TEST_DATA__DeathCasesAccessPoint: TEST_DATA__Relation = {
  columns: { CASE_TYPE: 'String', CASES: 'Float', DATE: 'StrictDate' },
  rows: TEST_DATA__COVIDData.filter(
    (instance) => instance.caseType === 'Death',
  ).map((instance) => ({
    CASE_TYPE: instance.caseType,
    CASES: instance.cases,
    DATE: instance.date,
  })),
};

/**
 * The data behind Lakehouse access points, keyed by
 * `<data product path>.<access point id>`.
 */
export const TEST_DATA__LakehouseAccessPoints: Record<
  string,
  TEST_DATA__Relation
> = {
  'test::CovidDataProduct.confirmed_cases':
    TEST_DATA__ConfirmedCasesAccessPoint,
  'test::CovidDataProduct.death_cases': TEST_DATA__DeathCasesAccessPoint,
};

/**
 * Ingest definitions of the test project, with the data ingested into each
 * of their data sets. A `writeMode` of `batch_milestoned` makes Lakehouse add
 * batch milestoning columns to the data sets.
 */
export const TEST_DATA__IngestDefinitions: {
  path: string;
  writeMode?: string;
  dataSets: Record<string, TEST_DATA__Relation>;
}[] = [
  {
    path: 'test::CovidIngest',
    dataSets: {
      CovidCases: {
        columns: {
          FIPS: 'String',
          DATE: 'StrictDate',
          CASE_TYPE: 'String',
          CASES: 'Float',
        },
        rows: TEST_DATA__COVIDData.map((instance) => ({
          FIPS: instance.fips,
          DATE: instance.date,
          CASE_TYPE: instance.caseType,
          CASES: instance.cases,
        })),
      },
      Demographics: {
        columns: { FIPS: 'String', STATE: 'String' },
        rows: TEST_DATA__COVIDData.map((instance) => ({
          FIPS: instance.demographics.fips,
          STATE: instance.demographics.state,
        })),
      },
    },
  },
  {
    path: 'test::HospitalIngest',
    writeMode: 'batch_milestoned',
    dataSets: {
      Admissions: {
        columns: { HOSPITAL: 'String', PATIENTS: 'Integer' },
        rows: [
          { HOSPITAL: 'Mercy', PATIENTS: 12 },
          { HOSPITAL: 'St. Mary', PATIENTS: 30 },
          { HOSPITAL: 'General', PATIENTS: 7 },
        ],
      },
    },
  },
];
