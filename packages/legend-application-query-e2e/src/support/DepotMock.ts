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

import type { Page } from '@playwright/test';
import {
  TEST_DATA__ConfirmedCasesAccessPoint,
  TEST_DATA__DeathCasesAccessPoint,
  TEST_DATA__IngestDefinitions,
  TEST_DATA__MappingModelCoverage,
  type TEST_DATA__Relation,
} from './TEST_DATA__EngineResponses.js';

/**
 * Depot responses are served by the real mock depot server
 * (`@finos/legend-fixture-mock-server`), which holds a single data space
 * with a single execution context — enough for most tests, but not for
 * exercising the setup panel's selectors.
 *
 * Rather than growing that shared fixture (it backs local development for
 * every Legend app), these helpers intercept its responses and enrich them
 * per-test, so the extra shapes live next to the specs that assert on them
 * and stay in sync with the fixture they extend.
 */

/** Prefix of the extra data spaces added by {@link mockAdditionalDataSpaces}. */
export const EXTRA_DATA_SPACE_TITLE_PREFIX = 'Extra DataSpace';

/** Name of the execution context added by {@link mockSecondExecutionContext}. */
export const SECOND_EXECUTION_CONTEXT_NAME = 'secondContext';

/** Title of the execution context added by {@link mockSecondExecutionContext}. */
export const SECOND_EXECUTION_CONTEXT_TITLE = 'Second Context';

/** Path of the enumeration added by {@link mockEnrichedModel}. */
export const REPORT_STATUS_ENUMERATION_PATH = 'test::ReportStatus';

/** Values of the enumeration added by {@link mockEnrichedModel}, in order. */
export const REPORT_STATUS_VALUES = ['Preliminary', 'Final', 'Revised'];

const COVID_DATA_CLASS_PATH = 'test::COVIDData';
const DEMOGRAPHICS_CLASS_PATH = 'test::Demographics';
const COVID_DATA_STORE_PATH = 'test::CovidDataStore';
const COVID_DATA_MAPPING_PATH = 'test::CovidDataMapping';
const REPORT_STATUS_PROPERTY = 'reportStatus';
const REPORT_STATUS_COLUMN = 'REPORT_STATUS';

interface DataSpaceStoredEntity {
  entity: {
    path: string;
    content: Record<string, unknown>;
  };
}

/**
 * Pad the data space listing out to `total` entries by cloning the fixture's
 * data space under new paths and titles.
 *
 * NOTE: only the fixture's own data space has backing model data, so the
 * clones are listing-only — a test may assert they appear in the dropdown,
 * but must not select one.
 */
export const mockAdditionalDataSpaces = async (
  page: Page,
  total: number,
): Promise<void> => {
  await page.route(/\/depot\/api\/classifiers\/.*\/entities/, async (route) => {
    const response = await route.fetch();
    const entries = (await response.json()) as DataSpaceStoredEntity[];
    const base = entries[0];
    if (!base) {
      await route.fulfill({ json: entries });
      return;
    }
    const clones = Array.from({ length: Math.max(total - 1, 0) }, (_, idx) => {
      const suffix = idx + 1;
      return {
        ...base,
        entity: {
          ...base.entity,
          path: `test::ExtraDataSpace${suffix}`,
          content: {
            ...base.entity.content,
            name: `ExtraDataSpace${suffix}`,
            title: `${EXTRA_DATA_SPACE_TITLE_PREFIX} ${suffix}`,
          },
        },
      };
    });
    await route.fulfill({ json: [base, ...clones] });
  });
};

/**
 * Give the fixture's data space a second execution context.
 *
 * The setup panel only renders its context selector when a data space has
 * more than one context, and it reads them from the built graph — so this
 * patches the project entities the graph is built from, not the data space
 * analytics artifact.
 *
 * The added context reuses the first one's mapping and runtime, so it stays
 * valid without the fixture needing extra model elements.
 */
export const mockSecondExecutionContext = async (page: Page): Promise<void> => {
  const addExecutionContext = (node: unknown): void => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(addExecutionContext);
      return;
    }
    const record = node as Record<string, unknown>;
    if (
      record._type === 'dataSpace' &&
      Array.isArray(record.executionContexts) &&
      record.executionContexts.length === 1
    ) {
      const [first] = record.executionContexts as Record<string, unknown>[];
      record.executionContexts = [
        first,
        {
          ...first,
          name: SECOND_EXECUTION_CONTEXT_NAME,
          title: SECOND_EXECUTION_CONTEXT_TITLE,
        },
      ];
      return;
    }
    Object.values(record).forEach(addExecutionContext);
  };

  // the graph is built from either of these, depending on the flow
  for (const pattern of [
    /\/depot\/api\/projects\/.*\/versions\/[^/]+$/,
    /\/pureModelContextData$/,
  ]) {
    await page.route(pattern, async (route) => {
      const response = await route.fetch();
      const data = (await response.json()) as unknown;
      addExecutionContext(data);
      await route.fulfill({ json: data });
    });
  }
};

interface ModelElement extends Record<string, unknown> {
  _type: string;
  name: string;
  package: string;
}

const REPORT_STATUS_ENUMERATION: ModelElement = {
  _type: 'Enumeration',
  name: 'ReportStatus',
  package: 'test',
  values: REPORT_STATUS_VALUES.map((value) => ({ value })),
};

const COVID_DATA_TABLE = {
  _type: 'Table',
  database: COVID_DATA_STORE_PATH,
  mainTableDb: COVID_DATA_STORE_PATH,
  schema: 'default',
  table: 'COVID_DATA',
};

const getElementPath = (element: ModelElement): string =>
  `${element.package}::${element.name}`;

/**
 * Give `test::COVIDData` an enum-typed `reportStatus` property, backed by a
 * new `REPORT_STATUS` column and mapped to it.
 */
const addReportStatusProperty = (element: ModelElement): void => {
  switch (getElementPath(element)) {
    case COVID_DATA_CLASS_PATH:
      (element.properties as unknown[]).push({
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: REPORT_STATUS_ENUMERATION_PATH,
          },
        },
        multiplicity: { lowerBound: 0, upperBound: 1 },
        name: REPORT_STATUS_PROPERTY,
      });
      return;
    case COVID_DATA_STORE_PATH: {
      const schemas = element.schemas as {
        tables: { name: string; columns: unknown[] }[];
      }[];
      schemas
        .flatMap((schema) => schema.tables)
        .find((table) => table.name === COVID_DATA_TABLE.table)
        ?.columns.push({
          name: REPORT_STATUS_COLUMN,
          nullable: true,
          type: { _type: 'Varchar', size: 200 },
        });
      return;
    }
    case COVID_DATA_MAPPING_PATH: {
      const classMappings = element.classMappings as {
        class: string;
        propertyMappings: unknown[];
      }[];
      classMappings
        .find((classMapping) => classMapping.class === COVID_DATA_CLASS_PATH)
        ?.propertyMappings.push({
          _type: 'relationalPropertyMapping',
          property: {
            class: COVID_DATA_CLASS_PATH,
            property: REPORT_STATUS_PROPERTY,
          },
          relationalOperation: {
            _type: 'column',
            column: REPORT_STATUS_COLUMN,
            table: COVID_DATA_TABLE,
            tableAlias: COVID_DATA_TABLE.table,
          },
        });
      return;
    }
    default:
      return;
  }
};

/**
 * Enrich the fixture's model with the shapes the query builder treats
 * specially, which the flat `test::COVIDData` class otherwise lacks:
 *
 * - an association: `COVIDData.demographics` (to `test::Demographics`) is
 *   already modelled and mapped, but the fixture's data space analytics omit
 *   it from the mapping coverage, so the explorer hides it — this adds the
 *   missing coverage entry, making `Demographics` navigable
 * - an enumeration: an enum-typed `reportStatus` property of type
 *   {@link REPORT_STATUS_ENUMERATION_PATH}, so filters get an enum value
 *   editor
 *
 * The enum property is mapped to a plain column with no enumeration mapping:
 * enough to build the graph and the query, since execution is mocked.
 *
 * NOTE: this intercepts the same project responses as
 * {@link mockSecondExecutionContext}, so the two can't be combined.
 */
export const mockEnrichedModel = async (page: Page): Promise<void> => {
  // project entities, as `{ path, content, classifierPath }`
  await page.route(
    /\/depot\/api\/projects\/.*\/versions\/[^/]+$/,
    async (route) => {
      const response = await route.fetch();
      const entities = (await response.json()) as {
        path: string;
        content: ModelElement;
        classifierPath: string;
      }[];
      entities.forEach((entity) => addReportStatusProperty(entity.content));
      entities.push({
        path: REPORT_STATUS_ENUMERATION_PATH,
        content: REPORT_STATUS_ENUMERATION,
        classifierPath: 'meta::pure::metamodel::type::Enumeration',
      });
      await route.fulfill({ json: entities });
    },
  );

  // the same model, as protocol elements
  await page.route(/\/pureModelContextData$/, async (route) => {
    const response = await route.fetch();
    const data = (await response.json()) as { elements: ModelElement[] };
    data.elements.forEach(addReportStatusProperty);
    data.elements.push(REPORT_STATUS_ENUMERATION);
    await route.fulfill({ json: data });
  });

  // the data space analytics file, served as a JSON string
  await page.route(
    /\/depot\/api\/generationFileContent\/.*AnalyticsResult\.json$/,
    async (route) => {
      const response = await route.fetch();
      const analytics = JSON.parse(await response.text()) as {
        mappingToMappingCoverageResult: Record<
          string,
          { mappedEntities: { path: string; properties: unknown[] }[] }
        >;
      };
      analytics.mappingToMappingCoverageResult[
        COVID_DATA_MAPPING_PATH
      ]?.mappedEntities
        .find((entity) => entity.path === COVID_DATA_CLASS_PATH)
        ?.properties.push(
          {
            _type: 'entity',
            name: 'demographics',
            entityPath: DEMOGRAPHICS_CLASS_PATH,
          },
          {
            _type: 'enum',
            name: REPORT_STATUS_PROPERTY,
            enumPath: REPORT_STATUS_ENUMERATION_PATH,
          },
        );
      await route.fulfill({ response, body: JSON.stringify(analytics) });
    },
  );
};

/** Project coordinates of the fixture's (only) project. */
const TEST_PROJECT = {
  projectId: 'LEGEND-QUERY-TEST',
  groupId: 'org.finos.legend.test',
  artifactId: 'legend-query-test',
};

/** The single released version of the fixture's project. */
export const TEST_PROJECT_VERSION = '0.0.1';

/**
 * List the fixture's project and its released version, which the mock depot
 * server doesn't serve: the setup wizards (e.g. creating a query on a
 * mapping) start by picking a project and a version from these listings.
 */
export const mockProjectListing = async (page: Page): Promise<void> => {
  await page.route(/\/depot\/api\/project-configurations$/, (route) =>
    route.fulfill({ json: [TEST_PROJECT] }),
  );
  await page.route(
    /\/depot\/api\/projects\/[^/]+\/[^/]+\/versions(?:\?.*)?$/,
    (route) => route.fulfill({ json: [TEST_PROJECT_VERSION] }),
  );
};

/** Path of the service added by {@link mockServiceModel}. */
export const COVID_CASES_SERVICE_PATH = 'test::CovidCasesService';

const variable = (name: string) => ({ _type: 'var', name });
const property = (name: string, owner: unknown) => ({
  _type: 'property',
  property: name,
  parameters: [owner],
});
const lambda = (body: unknown, parameter = 'x') => ({
  _type: 'lambda',
  body: [body],
  parameters: [variable(parameter)],
});
const strings = (values: string[]) => ({
  _type: 'collection',
  multiplicity: { lowerBound: values.length, upperBound: values.length },
  values: values.map((value) => ({ _type: 'string', value })),
});

/**
 * A service whose query is:
 *
 * ```pure
 * test::COVIDData.all()
 *   ->filter(x | $x.caseType == 'Confirmed')
 *   ->project([x | $x.caseType, x | $x.cases], ['Case Type', 'Cases'])
 * ```
 */
const COVID_CASES_SERVICE: ModelElement = {
  _type: 'service',
  name: 'CovidCasesService',
  package: 'test',
  pattern: '/covid/cases',
  owners: ['anonymous'],
  documentation: 'Confirmed COVID cases',
  autoActivateUpdates: true,
  execution: {
    _type: 'pureSingleExecution',
    func: {
      _type: 'lambda',
      parameters: [],
      body: [
        {
          _type: 'func',
          function: 'project',
          parameters: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'func',
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: COVID_DATA_CLASS_PATH,
                    },
                  ],
                },
                lambda({
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    property('caseType', variable('x')),
                    { _type: 'string', value: 'Confirmed' },
                  ],
                }),
              ],
            },
            {
              _type: 'collection',
              multiplicity: { lowerBound: 2, upperBound: 2 },
              values: [
                lambda(property('caseType', variable('x'))),
                lambda(property('cases', variable('x'))),
              ],
            },
            strings(['Case Type', 'Cases']),
          ],
        },
      ],
    },
    mapping: COVID_DATA_MAPPING_PATH,
    runtime: { _type: 'runtimePointer', runtime: 'test::H2Runtime' },
  },
  stereotypes: [],
  taggedValues: [],
  postValidations: [],
  testSuites: [],
};

/**
 * Add a service ({@link COVID_CASES_SERVICE_PATH}) to the fixture's model,
 * so a query can be created from it.
 *
 * NOTE: this intercepts the same project responses as
 * {@link mockEnrichedModel} and {@link mockSecondExecutionContext}, so it
 * can't be combined with either.
 */
export const mockServiceModel = async (page: Page): Promise<void> => {
  await page.route(
    /\/depot\/api\/projects\/.*\/versions\/[^/]+$/,
    async (route) => {
      const response = await route.fetch();
      const entities = (await response.json()) as unknown[];
      entities.push({
        path: COVID_CASES_SERVICE_PATH,
        content: COVID_CASES_SERVICE,
        classifierPath: 'meta::legend::service::metamodel::Service',
      });
      await route.fulfill({ json: entities });
    },
  );
  await page.route(/\/pureModelContextData$/, async (route) => {
    const response = await route.fetch();
    const data = (await response.json()) as { elements: ModelElement[] };
    data.elements.push(COVID_CASES_SERVICE);
    await route.fulfill({ json: data });
  });
};

/** Path of the data product served by {@link mockModelAccessDataProduct}. */
export const COVID_DATA_PRODUCT_PATH = 'test::CovidDataProduct';

/** Title of the data product served by {@link mockModelAccessDataProduct}. */
export const COVID_DATA_PRODUCT_TITLE = 'COVID Data Product';

/**
 * Id of the model access point group of the data product served by
 * {@link mockModelAccessDataProduct} that queries open on by default.
 */
export const COVID_ACCESS_POINT_GROUP_ID = 'covidCases';

/**
 * Id of a second model access point group of that data product, over the
 * same mapping.
 */
export const COVID_REPORTING_ACCESS_POINT_GROUP_ID = 'covidReporting';

/**
 * Id of a Lakehouse access point of the data product served by
 * {@link mockModelAccessDataProduct}, in the group
 * {@link COVID_LAKEHOUSE_ACCESS_POINT_GROUP_ID}.
 */
export const COVID_LAKEHOUSE_ACCESS_POINT_ID = 'confirmed_cases';

/** Id of the Lakehouse access point group of that access point. */
export const COVID_LAKEHOUSE_ACCESS_POINT_GROUP_ID = 'covidLakehouse';

/**
 * Id of a second Lakehouse access point of that data product, in another
 * group, {@link COVID_MORTALITY_ACCESS_POINT_GROUP_ID}.
 */
export const COVID_DEATHS_ACCESS_POINT_ID = 'death_cases';

/** Id of the Lakehouse access point group of that access point. */
export const COVID_MORTALITY_ACCESS_POINT_GROUP_ID = 'covidMortality';

/** The columns of {@link COVID_LAKEHOUSE_ACCESS_POINT_ID}, with their types. */
export const COVID_LAKEHOUSE_ACCESS_POINT_COLUMNS =
  TEST_DATA__ConfirmedCasesAccessPoint.columns;

/** A Lakehouse access point group of a data product artifact. */
const lakehouseAccessPointGroup = (
  id: string,
  description: string,
  accessPoints: Record<string, TEST_DATA__Relation>,
): Record<string, unknown> => ({
  id,
  description,
  accessPointImplementations: Object.entries(accessPoints).map(
    ([accessPointId, data]) => ({
      id: accessPointId,
      description: `COVID cases: ${accessPointId}`,
      resourceBuilder: {
        _type: 'databaseDDL',
        reproducible: false,
        targetEnvironment: 'Snowflake',
        script: `CREATE VIEW ${accessPointId.toUpperCase()} AS SELECT 1`,
        resourceType: 'VIEW',
      },
      // what querying the access point returns: a relation
      lambdaGenericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'meta::pure::metamodel::relation::Relation',
        },
        typeArguments: [
          {
            rawType: {
              _type: 'relationType',
              columns: Object.entries(data.columns).map(([name, type]) => ({
                name,
                genericType: {
                  rawType: { _type: 'packageableType', fullPath: type },
                },
                multiplicity: { lowerBound: 0, upperBound: 1 },
              })),
            },
          },
        ],
      },
      dependencyDatasets: [],
      dependencyAccessPoints: [],
    }),
  ),
});

/**
 * Serve the deployment artifact of a data product,
 * {@link COVID_DATA_PRODUCT_PATH}, which exposes:
 * - the fixture's model through two model access point groups
 *   ({@link COVID_ACCESS_POINT_GROUP_ID} and
 *   {@link COVID_REPORTING_ACCESS_POINT_GROUP_ID}) on `test::CovidDataMapping`
 * - two Lakehouse access points, each in its own group:
 *   {@link COVID_LAKEHOUSE_ACCESS_POINT_ID} and
 *   {@link COVID_DEATHS_ACCESS_POINT_ID}
 *
 * Legend Query builds a data product's graph from this artifact alone — the
 * mapping generation's model plus stubs for the mapping and the data product
 * — rather than from the project's entities, so the artifact is assembled
 * from the fixture's own class definitions to stay in sync with them.
 *
 * NOTE: the graph only has the access point groups of the kind a query is
 * opened on, so a query can switch between the model access point groups, or
 * between the Lakehouse access points, but not from one kind to the other.
 *
 * NOTE: data product queries run on a Lakehouse runtime, which needs the
 * user's Lakehouse environment: see `mockLakehouseUserEnvironment()`.
 */
export const mockModelAccessDataProduct = async (page: Page): Promise<void> => {
  await page.route(
    /\/depot\/api\/generations\/[^/]+\/[^/]+\/[^/]+\/types\/dataProduct(?:\?.*)?$/,
    async (route) => {
      const url = route.request().url();
      const { groupId, artifactId, versionId } =
        /\/generations\/(?<groupId>[^/]+)\/(?<artifactId>[^/]+)\/(?<versionId>[^/]+)\//.exec(
          url,
        )?.groups ?? {};
      // the project's entities, to pick the classes from
      const entitiesResponse = await route.fetch({
        url: url.replace(
          /\/generations\/.*$/,
          `/projects/${groupId}/${artifactId}/versions/${versionId}`,
        ),
      });
      const classes = (
        (await entitiesResponse.json()) as { content: ModelElement }[]
      )
        .map((entity) => entity.content)
        .filter((element) => element._type === 'class');
      // a data product's mapping is only stubbed in the graph, so the
      // artifact says which mapped classes can be queried
      const mappingGeneration = {
        path: COVID_DATA_MAPPING_PATH,
        model: { _type: 'data', elements: classes },
        mappedEntities: TEST_DATA__MappingModelCoverage.mappedEntities.map(
          (entity) => ({
            ...entity,
            info: {
              classPath: entity.path,
              isRootEntity: entity.path === COVID_DATA_CLASS_PATH,
              subClasses: [],
            },
          }),
        ),
      };
      const modelAccessPointGroup = (
        id: string,
        description: string,
      ): Record<string, unknown> => ({
        _type: 'modelAccessPointGroup',
        id,
        description,
        accessPointImplementations: [],
        mappingGeneration,
        diagrams: [],
        model: { _type: 'data', elements: [] },
        elements: [COVID_DATA_CLASS_PATH],
        elementDocs: [],
      });
      const artifact = {
        dataProduct: {
          path: COVID_DATA_PRODUCT_PATH,
          deploymentId: 'covid-data-product',
          title: COVID_DATA_PRODUCT_TITLE,
          description: 'COVID cases, as a data product',
          dataProductType: { _type: 'internalDataProductType' },
        },
        accessPointGroups: [
          modelAccessPointGroup(
            COVID_ACCESS_POINT_GROUP_ID,
            'COVID cases by day and region',
          ),
          modelAccessPointGroup(
            COVID_REPORTING_ACCESS_POINT_GROUP_ID,
            'COVID cases, for reporting',
          ),
          lakehouseAccessPointGroup(
            COVID_LAKEHOUSE_ACCESS_POINT_GROUP_ID,
            'COVID cases, as Lakehouse tables',
            {
              [COVID_LAKEHOUSE_ACCESS_POINT_ID]:
                TEST_DATA__ConfirmedCasesAccessPoint,
            },
          ),
          lakehouseAccessPointGroup(
            COVID_MORTALITY_ACCESS_POINT_GROUP_ID,
            'COVID deaths, as Lakehouse tables',
            {
              [COVID_DEATHS_ACCESS_POINT_ID]: TEST_DATA__DeathCasesAccessPoint,
            },
          ),
        ],
      };
      await route.fulfill({
        json: [
          {
            groupId,
            artifactId,
            versionId,
            type: 'dataProduct',
            path: COVID_DATA_PRODUCT_PATH,
            file: {
              path: `${COVID_DATA_PRODUCT_PATH.replace('::', '/')}.json`,
              content: JSON.stringify(artifact),
            },
          },
        ],
      });
    },
  );
};

const INGEST_DEFINITION_CLASSIFIER_PATH =
  'meta::external::ingest::specification::metamodel::IngestDefinition';

/** Paths of the ingest definitions served by {@link mockIngestDefinitions}. */
export const COVID_INGEST_PATH = 'test::CovidIngest';
export const HOSPITAL_INGEST_PATH = 'test::HospitalIngest';

/**
 * Serve the project's ingest definitions — see `TEST_DATA__IngestDefinitions`
 * for their data sets — which Legend Query lists by classifier: an ingest
 * query builds only the ingest definition it queries into its graph, rather
 * than the whole project.
 */
export const mockIngestDefinitions = async (page: Page): Promise<void> => {
  await page.route(
    new RegExp(
      `/depot/api/projects/(?<groupId>[^/]+)/(?<artifactId>[^/]+)/versions/(?<versionId>[^/]+)/classifiers/${INGEST_DEFINITION_CLASSIFIER_PATH}$`,
    ),
    (route) => {
      const { groupId, artifactId, versionId } =
        /\/projects\/(?<groupId>[^/]+)\/(?<artifactId>[^/]+)\/versions\/(?<versionId>[^/]+)\//.exec(
          route.request().url(),
        )?.groups ?? {};
      return route.fulfill({
        json: TEST_DATA__IngestDefinitions.map((ingest) => {
          const [packagePath, name] = ingest.path.split('::');
          return {
            groupId,
            artifactId,
            versionId,
            entity: {
              path: ingest.path,
              classifierPath: INGEST_DEFINITION_CLASSIFIER_PATH,
              content: {
                _type: 'ingestDefinition',
                package: packagePath,
                name,
                ...(ingest.writeMode
                  ? { writeMode: { _type: ingest.writeMode } }
                  : {}),
                datasets: Object.entries(ingest.dataSets).map(
                  ([dataSetName, dataSet]) => ({
                    name: dataSetName,
                    primaryKey: [],
                    source: {
                      _type: 'serializedSource',
                      schema: {
                        _type: 'relationType',
                        columns: Object.entries(dataSet.columns).map(
                          ([columnName, type]) => ({
                            name: columnName,
                            genericType: {
                              rawType: {
                                _type: 'packageableType',
                                fullPath: type,
                              },
                              typeArguments: [],
                              multiplicityArguments: [],
                              typeVariableValues: [],
                            },
                            multiplicity: { lowerBound: 0, upperBound: 1 },
                          }),
                        ),
                      },
                    },
                  }),
                ),
              },
            },
          };
        }),
      });
    },
  );
};
