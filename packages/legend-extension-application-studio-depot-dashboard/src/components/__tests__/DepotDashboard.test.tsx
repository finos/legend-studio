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

import { jest, expect, test } from '@jest/globals';
import {
  type V1_StereotypePtr,
  CORE_PURE_PATH,
  V1_AccessPointGroup,
  V1_DataProduct,
  V1_dataProductModelSchema,
} from '@finos/legend-graph';
import {
  DepotServerClient,
  StoredSummaryEntity,
  StoreProjectData,
} from '@finos/legend-server-depot';
import { createSpy } from '@finos/legend-shared/test';
import {
  DATA_PRODUCT_DASHBOARD_HEADER,
  DepotDashboardStore,
  getDataProductGridValue,
} from '../../stores/DepotDashboardStore.js';
import { flowResult } from 'mobx';
import { DepotDashboard } from '../DepotDashboard.js';
import { serialize } from 'serializr';
import {
  ApplicationFrameworkProvider,
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { render, screen, act } from '@testing-library/react';
import {
  TEST__BrowserEnvironmentProvider,
  TEST__getApplicationVersionData,
} from '@finos/legend-application/test';
import {
  type LegendStudioApplicationStore,
  LegendStudioApplicationConfig,
  LegendStudioPluginManager,
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from '@finos/legend-application-studio';

jest.mock('@finos/legend-application-studio', () => {
  const actual = jest.requireActual('@finos/legend-application-studio');
  return {
    ...(actual as object),
    useLegendStudioApplicationStore: jest.fn(),
    useLegendStudioBaseStore: jest.fn(),
  };
});

const TEST_DATA__studioConfig = {
  appName: 'studio',
  env: 'test',
  sdlc: {
    url: 'https://testSdlcUrl',
  },
  depot: {
    url: 'https://testDepotUrl',
  },
  engine: {
    url: 'https://testEngineUrl',
  },
};

const setupDepotDashboardTest = async (
  mockEntitySummaries: StoredSummaryEntity[],
  mockDataProducts: Map<string, V1_DataProduct>,
  mockProjects?: Map<string, StoreProjectData>,
  applicationConfig?: {
    extensions?: {
      core?: {
        dataProductConfig?: {
          publicStereotype?: { profile: string; stereotype: string };
          classifications?: string[];
        };
      };
    };
  },
) => {
  const pluginManager = LegendStudioPluginManager.create();

  const config = new LegendStudioApplicationConfig({
    configData: {
      ...TEST_DATA__studioConfig,
      ...applicationConfig,
    },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/studio/',
  });

  const applicationStore = new ApplicationStore(config, pluginManager);

  const depotServerClient = new DepotServerClient({
    serverUrl: 'http://test-depot-server',
  });

  (useLegendStudioApplicationStore as jest.Mock).mockReturnValue(
    applicationStore,
  );
  (useLegendStudioBaseStore as jest.Mock).mockReturnValue({
    depotServerClient,
  });

  createSpy(
    depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockImplementation(async (classifier, options) => {
    return mockEntitySummaries.map((summary) =>
      StoredSummaryEntity.serialization.toJson(summary),
    );
  });

  createSpy(depotServerClient, 'getVersionEntity').mockImplementation(
    async (groupId, artifactId, versionId, path) => {
      const dataProduct = mockDataProducts.get(path);
      if (!dataProduct) {
        throw new Error(`No mock data product found for path: ${path}`);
      }
      return {
        path,
        classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
        content: serialize(
          V1_dataProductModelSchema(
            pluginManager.getPureProtocolProcessorPlugins(),
          ),
          dataProduct,
        ),
      };
    },
  );

  createSpy(depotServerClient, 'getProject').mockImplementation(
    async (groupId, artifactId) => {
      const key = `${groupId}:${artifactId}`;
      const project = mockProjects?.get(key);
      if (!project) {
        return {
          projectId: `test-project-${groupId}-${artifactId}`,
          groupId,
          artifactId,
        };
      }
      return StoreProjectData.serialization.toJson(project);
    },
  );

  const depotDashboardStore = new DepotDashboardStore(
    applicationStore as unknown as LegendStudioApplicationStore,
    depotServerClient,
  );

  await act(async () => {
    await flowResult(depotDashboardStore.dataProductDepotState.init());

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  let renderResult;
  await act(async () => {
    renderResult = render(
      <ApplicationStoreProvider store={applicationStore}>
        <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
          <ApplicationFrameworkProvider>
            <DepotDashboard />
          </ApplicationFrameworkProvider>
        </TEST__BrowserEnvironmentProvider>
      </ApplicationStoreProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    renderResult,
    depotDashboardStore,
    applicationStore,
    depotServerClient,
  };
};

const createMockEntitySummary = (
  groupId: string,
  artifactId: string,
  versionId: string,
  path: string,
): StoredSummaryEntity => {
  const summary = new StoredSummaryEntity();
  summary.groupId = groupId;
  summary.artifactId = artifactId;
  summary.versionId = versionId;
  summary.path = path;
  return summary;
};

const createMockDataProduct = (
  name: string,
  options?: {
    title?: string;
    description?: string;
    accessPointGroups?: V1_AccessPointGroup[];
    stereotypes?: V1_StereotypePtr[];
  },
): V1_DataProduct => {
  const dataProduct = new V1_DataProduct();
  dataProduct.name = name;
  dataProduct.title = options?.title;
  dataProduct.description = options?.description;
  dataProduct.accessPointGroups = options?.accessPointGroups ?? [];
  dataProduct.stereotypes = options?.stereotypes ?? [];
  dataProduct.taggedValues = [];
  return dataProduct;
};

const createEnterpriseAPG = (id: string): V1_AccessPointGroup => {
  const apg = new V1_AccessPointGroup();
  apg.id = id;
  apg.title = `${id} Title`;
  apg.description = `${id} Description`;
  apg.accessPoints = [];
  apg.stereotypes = [
    {
      profile:
        'meta::external::catalog::dataProduct::governance::DataClassification',
      value: 'enterprise',
      hashCode: '123',
    },
  ];
  return apg;
};

test('display data products in grid', async () => {
  const summaries = [
    createMockEntitySummary(
      'test.group',
      'test-artifact',
      '1.0.0',
      'test::DataProduct1',
    ),
    createMockEntitySummary(
      'test.group',
      'test-artifact',
      '1.0.0',
      'test::DataProduct2',
    ),
  ];

  const dataProducts = new Map([
    [
      'test::DataProduct1',
      createMockDataProduct('DataProduct1', {
        title: 'Test Product 1',
        description: 'First test product',
      }),
    ],
    [
      'test::DataProduct2',
      createMockDataProduct('DataProduct2', {
        title: 'Test Product 2',
        description: 'Second test product',
      }),
    ],
  ]);

  await setupDepotDashboardTest(summaries, dataProducts);

  await screen.findByText('Test Product 1');
  await screen.findByText('Test Product 2');
  await screen.findByText('First test product');
  await screen.findByText('Second test product');
});

test('Identify data product has enterprise apg', async () => {
  const summaries = [
    createMockEntitySummary(
      'test.group',
      'test-artifact',
      '1.0.0',
      'test::EnterpriseProduct',
    ),
  ];

  const dataProducts = new Map([
    [
      'test::EnterpriseProduct',
      createMockDataProduct('EnterpriseProduct', {
        accessPointGroups: [createEnterpriseAPG('APG1')],
      }),
    ],
  ]);

  const config = {
    extensions: {
      core: {
        dataProductConfig: {
          publicStereotype: {
            profile:
              'meta::external::catalog::dataProduct::governance::DataClassification',
            stereotype: 'enterprise',
          },
        },
      },
    },
  };

  const { depotDashboardStore } = await setupDepotDashboardTest(
    summaries,
    dataProducts,
    undefined,
    config,
  );

  const entityState =
    depotDashboardStore.dataProductDepotState.dataProductEntitiesStates?.[0];

  const enterpriseValue = getDataProductGridValue(
    entityState?.dataProduct,
    DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ENTERPRISE_GROUP,
    depotDashboardStore.applicationStore,
  );

  expect(enterpriseValue).toBe('True');
});

test('verifying data product access point groups', async () => {
  const summaries = [
    createMockEntitySummary(
      'test.group',
      'test-artifact',
      '1.0.0',
      'test::MultiAPGProduct',
    ),
  ];

  const apg1 = new V1_AccessPointGroup();
  apg1.id = 'APG1';
  apg1.title = 'First Access Point Group';
  apg1.description = 'First APG Description';
  apg1.accessPoints = [];
  apg1.stereotypes = [];

  const apg2 = new V1_AccessPointGroup();
  apg2.id = 'APG2';
  apg2.title = 'Second Access Point Group';
  apg2.description = 'Second APG Description';
  apg2.accessPoints = [];
  apg2.stereotypes = [];

  const dataProducts = new Map([
    [
      'test::MultiAPGProduct',
      createMockDataProduct('MultiAPGProduct', {
        title: 'Multi APG Product',
        accessPointGroups: [apg1, apg2],
      }),
    ],
  ]);

  const { depotDashboardStore } = await setupDepotDashboardTest(
    summaries,
    dataProducts,
  );

  const entityState =
    depotDashboardStore.dataProductDepotState.dataProductEntitiesStates?.[0];

  const apgNumber = getDataProductGridValue(
    entityState?.dataProduct,
    DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER,
    depotDashboardStore.applicationStore,
  );
  expect(apgNumber).toBe(2);

  const apgTitles = getDataProductGridValue(
    entityState?.dataProduct,
    DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_TITLE,
    depotDashboardStore.applicationStore,
  );
  expect(apgTitles).toBe('First Access Point Group,Second Access Point Group');
});
