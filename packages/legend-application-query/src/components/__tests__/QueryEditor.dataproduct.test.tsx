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

import { describe, test, expect } from '@jest/globals';
import { integrationTest, unitTest } from '@finos/legend-shared/test';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl,
  generateDataProductNativeRoute,
  generateDataProductModelRoute,
  generateDataProductRoute,
  generateDataProductLakehouseRoute,
  DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN,
  LEGEND_QUERY_ROUTE_PATTERN,
} from '../../__lib__/LegendQueryNavigation.js';
import { DataProductAccessType, stub_RawLambda } from '@finos/legend-graph';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import {
  TEST__provideMockedQueryEditorStore,
  TEST_QUERY_NAME,
  TEST__setUpDataProductExistingQueryEditor,
  TEST__setUpDataProductNativeExistingQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import { act, fireEvent, getByText, waitFor } from '@testing-library/react';
import {
  QueryableDataProduct,
  QueryableLegacyDataProduct,
} from '../../stores/data-space/DataProductQueryCreatorStore.js';
import { resolveQueryableElement } from '../data-space/DataProductQueryCreator.js';
import { DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN } from '../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import {
  generateGAVCoordinates,
  parseGAVCoordinates,
} from '@finos/legend-storage';
import { matchPath } from '@finos/legend-application/browser';

const TEST_DATA__DataProductEntities = [
  {
    path: 'test::MyDataProduct',
    content: {
      _type: 'dataProduct',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          accessPoints: [
            {
              _type: 'functionAccessPoint',
              id: 'myFuncAP',
              query: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 1 }],
                parameters: [],
              },
            },
            {
              _type: 'lakehouseAccessPoint',
              id: 'myLakehouseAP',
              func: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 1 }],
                parameters: [],
              },
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
          id: 'grp1',
          mapping: {
            path: 'model::dummyMapping',
          },
        },
      ],
      name: 'MyDataProduct',
      package: 'test',
      title: 'My Test Product',
      supportInfo: {
        emails: [
          {
            address: 'support@test.org',
            title: 'Support',
          },
        ],
      },
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'model::dummyMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'dummyMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::dummyRuntime',
    content: {
      _type: 'runtime',
      name: 'dummyRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'LakehouseRuntime',
        connectionStores: [],
        connections: [],
        mappings: [
          {
            path: 'model::dummyMapping',
            type: 'MAPPING',
          },
        ],
        environment: 'Production',
        warehouse: 'SNOW_WH_01',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
];

const TEST_DATA__NativeDataProductEntities = [
  {
    path: 'test::NativeDataProduct',
    content: {
      _type: 'dataProduct',
      nativeModelAccess: {
        defaultExecutionContext: 'defaultCtx',
        nativeModelExecutionContexts: [
          {
            key: 'defaultCtx',
            mapping: {
              path: 'model::dummyMapping',
            },
            runtime: {
              path: 'model::dummyRuntime',
            },
          },
        ],
        featuredElements: [],
        sampleQueries: [],
      },
      name: 'NativeDataProduct',
      package: 'test',
      title: 'My Native Product',
      supportInfo: {
        emails: [
          {
            address: 'native-support@test.org',
            title: 'Support',
          },
        ],
      },
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'model::dummyMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'dummyMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::dummyRuntime',
    content: {
      _type: 'runtime',
      name: 'dummyRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [
          {
            path: 'model::dummyMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
];

describe('DataProduct Info', () => {
  describe('Marketplace URL generation', () => {
    test(
      unitTest(
        'generateMarketplaceDataProductUrl produces correct URL with data product ID and deployment ID',
      ),
      () => {
        const url =
          EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl(
            'https://marketplace.example.com',
            'my-data-product',
            '42',
          );
        expect(url).toBe(
          'https://marketplace.example.com/dataProduct/deployed/my-data-product/42',
        );
      },
    );

    test(
      unitTest(
        'generateMarketplaceDataProductUrl handles special characters in data product name',
      ),
      () => {
        const url =
          EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl(
            'https://marketplace.example.com',
            'my::data::product',
            '100',
          );
        expect(url).toBe(
          'https://marketplace.example.com/dataProduct/deployed/my::data::product/100',
        );
      },
    );

    test(
      unitTest(
        'generateMarketplaceDataProductUrl handles trailing slash in base URL',
      ),
      () => {
        const url =
          EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl(
            'https://marketplace.example.com/',
            'product',
            '1',
          );
        expect(url).toBe(
          'https://marketplace.example.com//dataProduct/deployed/product/1',
        );
      },
    );
  });

  describe('LegendQueryApplicationConfig marketplace URL', () => {
    test(unitTest('Config reads marketplace URL when provided'), () => {
      const config = TEST__getTestLegendQueryApplicationConfig({
        marketplace: { url: 'https://testMarketplaceUrl' },
      });
      expect(config.marketplaceApplicationUrl).toBe(
        'https://testMarketplaceUrl',
      );
    });

    test(
      unitTest('Config marketplace URL is undefined when not provided'),
      () => {
        const config = TEST__getTestLegendQueryApplicationConfig();
        expect(config.marketplaceApplicationUrl).toBeUndefined();
      },
    );
  });

  describe('Route generation', () => {
    test(
      unitTest('generateDataProductNativeRoute produces correct URL pattern'),
      () => {
        const route = generateDataProductNativeRoute(
          'com.example',
          'my-artifact',
          '1.0.0',
          'test::MyDataProduct',
          'defaultCtx',
        );
        expect(route).toContain('/data-product/native/');
        expect(route).toContain('com.example');
        expect(route).toContain('my-artifact');
        expect(route).toContain('1.0.0');
        expect(route).toContain('test::MyDataProduct');
        expect(route).toContain('defaultCtx');
      },
    );

    test(
      unitTest('generateDataProductModelRoute produces correct URL pattern'),
      () => {
        const route = generateDataProductModelRoute(
          'com.example',
          'my-artifact',
          '1.0.0',
          'test::MyDataProduct',
          'grp1',
        );
        expect(route).toContain('/data-product/model/');
        expect(route).toContain('test::MyDataProduct');
        expect(route).toContain('grp1');
      },
    );

    test(
      unitTest(
        'generateDataProductRoute dispatches to native route for NATIVE type',
      ),
      () => {
        const route = generateDataProductRoute(
          'com.example',
          'my-artifact',
          '1.0.0',
          'test::MyDataProduct',
          DataProductAccessType.NATIVE,
          'defaultCtx',
        );
        expect(route).toContain('/data-product/native/');
      },
    );

    test(
      unitTest(
        'generateDataProductRoute dispatches to model route for MODEL type',
      ),
      () => {
        const route = generateDataProductRoute(
          'com.example',
          'my-artifact',
          '1.0.0',
          'test::MyDataProduct',
          DataProductAccessType.MODEL,
          'grp1',
        );
        expect(route).toContain('/data-product/model/');
      },
    );

    test(
      unitTest('generateDataProductRoute generates route for any access type'),
      () => {
        const route = generateDataProductRoute(
          'com.example',
          'my-artifact',
          '1.0.0',
          'test::MyDataProduct',
          'custom_type',
          'someKey',
        );
        expect(route).toContain('/data-product/custom_type/');
        expect(route).toContain('someKey');
      },
    );
  });

  describe('QueryableDataProduct and QueryableLegacyDataProduct', () => {
    test(
      unitTest(
        'QueryableDataProduct stores correct properties and computes path and execContext',
      ),
      () => {
        const dp = new QueryableDataProduct(
          'com.example',
          'my-artifact',
          '1.0.0',
          'test::MyProduct',
          DataProductAccessType.NATIVE,
          'execKey1',
        );
        expect(dp.groupId).toBe('com.example');
        expect(dp.artifactId).toBe('my-artifact');
        expect(dp.versionId).toBe('1.0.0');
        expect(dp.dataProductPath).toBe('test::MyProduct');
        expect(dp.dataProductType).toBe(DataProductAccessType.NATIVE);
        expect(dp.id).toBe('execKey1');
        expect(dp.path).toBe('test::MyProduct');
        expect(dp.execContext).toBe('execKey1');
      },
    );

    test(
      unitTest(
        'QueryableLegacyDataProduct stores correct properties and computes path and execContext',
      ),
      () => {
        const dp = new QueryableLegacyDataProduct(
          'com.example',
          'my-artifact',
          '1.0.0',
          'test::MyDataSpace',
          'defaultExecContext',
          'model::MyRuntime',
          'model::MyClass',
        );
        expect(dp.groupId).toBe('com.example');
        expect(dp.artifactId).toBe('my-artifact');
        expect(dp.versionId).toBe('1.0.0');
        expect(dp.dataSpacePath).toBe('test::MyDataSpace');
        expect(dp.executionContext).toBe('defaultExecContext');
        expect(dp.runtimePath).toBe('model::MyRuntime');
        expect(dp.classPath).toBe('model::MyClass');
        expect(dp.path).toBe('test::MyDataSpace');
        expect(dp.execContext).toBe('defaultExecContext');
      },
    );

    test(
      unitTest(
        'QueryableLegacyDataProduct optional fields default to undefined',
      ),
      () => {
        const dp = new QueryableLegacyDataProduct(
          'com.example',
          'my-artifact',
          '1.0.0',
          'test::MyDataSpace',
          'defaultExecContext',
        );
        expect(dp.runtimePath).toBeUndefined();
        expect(dp.classPath).toBeUndefined();
      },
    );
  });

  describe('Data Product Info Modal Content', () => {
    test(
      integrationTest(
        'Displays data product info modal with correct content for ModelAccessPointGroup',
      ),
      async () => {
        const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore();
        mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);
        const { renderResult } =
          await TEST__setUpDataProductExistingQueryEditor(
            mockedQueryEditorStore,
            'test::MyDataProduct',
            'grp1',
            stub_RawLambda(),
            TEST_DATA__DataProductEntities,
          );

        // Open the "See more options" menu
        await act(async () => {
          fireEvent.click(renderResult.getByTitle('See more options'));
        });

        // Click "About Data Product"
        await act(async () => {
          fireEvent.click(renderResult.getByText('About Data Product'));
        });

        // Verify the modal is shown and contains expected content
        const aboutModal = await waitFor(() =>
          renderResult.getByRole('dialog'),
        );

        // About Data Product title
        await waitFor(() => getByText(aboutModal, 'About Data Product'));

        // Project info
        await waitFor(() =>
          getByText(aboutModal, 'test.group:test-artifact:0.0.0'),
        );

        // Data Product name (title field)
        await waitFor(() => getByText(aboutModal, 'My Test Product'));

        // Access Point Group
        await waitFor(() => getByText(aboutModal, 'grp1'));

        // Mapping name
        await waitFor(() => getByText(aboutModal, 'dummyMapping'));

        // LakehouseRuntime environment and warehouse
        await waitFor(() => getByText(aboutModal, 'Production'));
        await waitFor(() => getByText(aboutModal, 'SNOW_WH_01'));

        // Access Points with type labels
        await waitFor(() => getByText(aboutModal, 'myFuncAP (Function)'));
        await waitFor(() => getByText(aboutModal, 'myLakehouseAP (Lakehouse)'));

        // Configuration link
        await waitFor(() =>
          getByText(aboutModal, 'Show Data Product Configuration'),
        );

        // Support Email
        await waitFor(() => getByText(aboutModal, 'support@test.org'));
      },
    );
  });

  describe('Existing Query - Native Execution Context', () => {
    test(
      integrationTest(
        'Loads existing query with native execution context and renders query builder',
      ),
      async () => {
        const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore();
        mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);
        const { renderResult } =
          await TEST__setUpDataProductNativeExistingQueryEditor(
            mockedQueryEditorStore,
            'test::NativeDataProduct',
            'defaultCtx',
            stub_RawLambda(),
            TEST_DATA__NativeDataProductEntities,
          );

        // Open the "See more options" menu
        await act(async () => {
          fireEvent.click(renderResult.getByTitle('See more options'));
        });

        // Click "About Data Product"
        await act(async () => {
          fireEvent.click(renderResult.getByText('About Data Product'));
        });

        // Verify the modal is shown and contains expected content
        const aboutModal = await waitFor(() =>
          renderResult.getByRole('dialog'),
        );

        // About Data Product title
        await waitFor(() => getByText(aboutModal, 'About Data Product'));

        // Project info
        await waitFor(() =>
          getByText(aboutModal, 'test.group:test-artifact:0.0.0'),
        );

        // Data Product name (title field)
        await waitFor(() => getByText(aboutModal, 'My Native Product'));

        // Mapping
        await waitFor(() => getByText(aboutModal, 'dummyMapping'));

        // Support Email
        await waitFor(() => getByText(aboutModal, 'native-support@test.org'));
      },
    );
  });

  describe('Existing Query - ModelAccess Execution Context', () => {
    test(
      integrationTest(
        'Loads existing query with model access execution context and renders query builder',
      ),
      async () => {
        const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore();
        mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);
        const { renderResult } =
          await TEST__setUpDataProductExistingQueryEditor(
            mockedQueryEditorStore,
            'test::MyDataProduct',
            'grp1',
            stub_RawLambda(),
            TEST_DATA__DataProductEntities,
          );

        // Open the "See more options" menu to verify data product info is available
        await act(async () => {
          fireEvent.click(renderResult.getByTitle('See more options'));
        });

        // "About Data Product" option should be present
        await waitFor(() => renderResult.getByText('About Data Product'));
      },
    );
  });
});

describe('resolveQueryableElement', () => {
  test(
    unitTest(
      'returns QueryableDataProduct when all data-product params are present',
    ),
    () => {
      const dpParams = {
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
          generateGAVCoordinates('com.example', 'my-artifact', '1.0.0'),
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]:
          'test::MyDataProduct',
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_TYPE]:
          DataProductAccessType.NATIVE,
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_ID]:
          'defaultCtx',
      };
      const result = resolveQueryableElement(
        dpParams,
        {},
        undefined,
        undefined,
      );
      expect(result).toBeInstanceOf(QueryableDataProduct);
      const dp = result as QueryableDataProduct;
      expect(dp.groupId).toBe('com.example');
      expect(dp.artifactId).toBe('my-artifact');
      expect(dp.versionId).toBe('1.0.0');
      expect(dp.dataProductPath).toBe('test::MyDataProduct');
      expect(dp.dataProductType).toBe(DataProductAccessType.NATIVE);
      expect(dp.id).toBe('defaultCtx');
    },
  );

  test(unitTest('returns QueryableDataProduct for MODEL access type'), () => {
    const dpParams = {
      [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
        generateGAVCoordinates('com.example', 'my-artifact', '2.0.0'),
      [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]:
        'test::ModelProduct',
      [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_TYPE]:
        DataProductAccessType.MODEL,
      [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_ID]:
        'grp1',
    };
    const result = resolveQueryableElement(dpParams, {}, undefined, undefined);
    expect(result).toBeInstanceOf(QueryableDataProduct);
    const dp = result as QueryableDataProduct;
    expect(dp.dataProductType).toBe(DataProductAccessType.MODEL);
    expect(dp.id).toBe('grp1');
  });

  test(
    unitTest('returns QueryableDataProduct for LAKEHOUSE access type'),
    () => {
      const dpParams = {
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
          generateGAVCoordinates('com.example', 'my-artifact', '3.0.0'),
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]:
          'test::LakehouseProduct',
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_TYPE]:
          DataProductAccessType.LAKEHOUSE,
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_ID]:
          'lhAP',
      };
      const result = resolveQueryableElement(
        dpParams,
        {},
        undefined,
        undefined,
      );
      expect(result).toBeInstanceOf(QueryableDataProduct);
      const dp = result as QueryableDataProduct;
      expect(dp.dataProductType).toBe(DataProductAccessType.LAKEHOUSE);
      expect(dp.id).toBe('lhAP');
    },
  );

  test(
    unitTest(
      'returns QueryableLegacyDataProduct when all legacy data-space params are present',
    ),
    () => {
      const dsParams = {
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
          generateGAVCoordinates('com.example', 'my-artifact', '1.0.0'),
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH]:
          'test::MyDataSpace',
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.EXECUTION_CONTEXT]:
          'defaultExecContext',
      };
      const result = resolveQueryableElement(
        {},
        dsParams,
        'model::MyRuntime',
        'model::MyClass',
      );
      expect(result).toBeInstanceOf(QueryableLegacyDataProduct);
      const dp = result as QueryableLegacyDataProduct;
      expect(dp.groupId).toBe('com.example');
      expect(dp.artifactId).toBe('my-artifact');
      expect(dp.versionId).toBe('1.0.0');
      expect(dp.dataSpacePath).toBe('test::MyDataSpace');
      expect(dp.executionContext).toBe('defaultExecContext');
      expect(dp.runtimePath).toBe('model::MyRuntime');
      expect(dp.classPath).toBe('model::MyClass');
    },
  );

  test(
    unitTest(
      'returns QueryableLegacyDataProduct without optional runtime/class params',
    ),
    () => {
      const dsParams = {
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
          generateGAVCoordinates('com.example', 'my-artifact', '1.0.0'),
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH]:
          'test::MyDataSpace',
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.EXECUTION_CONTEXT]:
          'defaultExecContext',
      };
      const result = resolveQueryableElement(
        {},
        dsParams,
        undefined,
        undefined,
      );
      expect(result).toBeInstanceOf(QueryableLegacyDataProduct);
      const dp = result as QueryableLegacyDataProduct;
      expect(dp.runtimePath).toBeUndefined();
      expect(dp.classPath).toBeUndefined();
    },
  );

  test(
    unitTest(
      'data-product params take precedence over data-space params when both are present',
    ),
    () => {
      // Simulates the merged `params` object having both sets of keys
      const mergedParams = {
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
          generateGAVCoordinates('com.dp', 'dp-artifact', '1.0.0'),
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]:
          'test::MyDataProduct',
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_TYPE]:
          DataProductAccessType.NATIVE,
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_ID]:
          'ap1',
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH]:
          'test::MyDataSpace',
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.EXECUTION_CONTEXT]:
          'someCtx',
      };
      const result = resolveQueryableElement(
        mergedParams,
        mergedParams,
        undefined,
        undefined,
      );
      // Data-product branch wins because it's checked first
      expect(result).toBeInstanceOf(QueryableDataProduct);
    },
  );

  test(
    unitTest(
      'returns undefined when no route params are provided (DEFAULT route)',
    ),
    () => {
      const result = resolveQueryableElement({}, {}, undefined, undefined);
      expect(result).toBeUndefined();
    },
  );

  test(
    unitTest(
      'returns undefined when data-product params are incomplete (missing accessId)',
    ),
    () => {
      const dpParams = {
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
          generateGAVCoordinates('com.example', 'my-artifact', '1.0.0'),
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]:
          'test::MyDataProduct',
        [DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_TYPE]:
          DataProductAccessType.NATIVE,
        // accessId intentionally missing
      };
      const result = resolveQueryableElement(
        dpParams,
        {},
        undefined,
        undefined,
      );
      expect(result).toBeUndefined();
    },
  );

  test(
    unitTest(
      'returns undefined when legacy data-space params are incomplete (missing executionContext)',
    ),
    () => {
      const dsParams = {
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
          generateGAVCoordinates('com.example', 'my-artifact', '1.0.0'),
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH]:
          'test::MyDataSpace',
        // executionContext intentionally missing
      };
      const result = resolveQueryableElement(
        {},
        dsParams,
        undefined,
        undefined,
      );
      expect(result).toBeUndefined();
    },
  );
});

describe('Route generation - completeness', () => {
  test(
    unitTest('generateDataProductLakehouseRoute produces correct URL pattern'),
    () => {
      const route = generateDataProductLakehouseRoute(
        'com.example',
        'my-artifact',
        '1.0.0',
        'test::MyDataProduct',
        'lhAP',
      );
      expect(route).toContain('/data-product/lakehouse/');
      expect(route).toContain('test::MyDataProduct');
      expect(route).toContain('lhAP');
    },
  );

  test(
    unitTest(
      'all access-type route helpers generate URLs matching the DATA_PRODUCT pattern',
    ),
    () => {
      const routes = [
        generateDataProductNativeRoute('g', 'a', 'v', 'dp::Path', 'apId'),
        generateDataProductModelRoute('g', 'a', 'v', 'dp::Path', 'apId'),
        generateDataProductLakehouseRoute('g', 'a', 'v', 'dp::Path', 'apId'),
      ];
      for (const route of routes) {
        const match = matchPath(LEGEND_QUERY_ROUTE_PATTERN.DATA_PRODUCT, route);
        expect(match).not.toBeNull();
      }
    },
  );
});

describe('Route round-trip', () => {
  test(
    unitTest(
      'native route round-trips through resolveQueryableElement to QueryableDataProduct',
    ),
    () => {
      const route = generateDataProductNativeRoute(
        'com.example',
        'my-artifact',
        '1.0.0',
        'test::MyDP',
        'nativeAP',
      );
      const match = matchPath(LEGEND_QUERY_ROUTE_PATTERN.DATA_PRODUCT, route);
      expect(match).not.toBeNull();
      const params = (match as NonNullable<typeof match>).params;
      const result = resolveQueryableElement(
        params,
        params,
        undefined,
        undefined,
      );
      expect(result).toBeInstanceOf(QueryableDataProduct);
      const dp = result as QueryableDataProduct;
      expect(dp.groupId).toBe('com.example');
      expect(dp.artifactId).toBe('my-artifact');
      expect(dp.versionId).toBe('1.0.0');
      expect(dp.dataProductPath).toBe('test::MyDP');
      expect(dp.dataProductType).toBe(DataProductAccessType.NATIVE);
      expect(dp.id).toBe('nativeAP');
    },
  );

  test(
    unitTest(
      'model route round-trips through resolveQueryableElement to QueryableDataProduct',
    ),
    () => {
      const route = generateDataProductModelRoute(
        'org.finos',
        'legend',
        '2.5.0',
        'prod::ModelDP',
        'modelGrp',
      );
      const match = matchPath(LEGEND_QUERY_ROUTE_PATTERN.DATA_PRODUCT, route);
      expect(match).not.toBeNull();
      const params = (match as NonNullable<typeof match>).params;
      const result = resolveQueryableElement(
        params,
        params,
        undefined,
        undefined,
      );
      expect(result).toBeInstanceOf(QueryableDataProduct);
      const dp = result as QueryableDataProduct;
      expect(dp.groupId).toBe('org.finos');
      expect(dp.dataProductType).toBe(DataProductAccessType.MODEL);
      expect(dp.id).toBe('modelGrp');
    },
  );

  test(
    unitTest(
      'lakehouse route round-trips through resolveQueryableElement to QueryableDataProduct',
    ),
    () => {
      const route = generateDataProductLakehouseRoute(
        'com.test',
        'lake-artifact',
        '0.1.0',
        'lake::DP',
        'lakeAP',
      );
      const match = matchPath(LEGEND_QUERY_ROUTE_PATTERN.DATA_PRODUCT, route);
      expect(match).not.toBeNull();
      const params = (match as NonNullable<typeof match>).params;
      const result = resolveQueryableElement(
        params,
        params,
        undefined,
        undefined,
      );
      expect(result).toBeInstanceOf(QueryableDataProduct);
      const dp = result as QueryableDataProduct;
      expect(dp.dataProductType).toBe(DataProductAccessType.LAKEHOUSE);
      expect(dp.id).toBe('lakeAP');
    },
  );

  test(unitTest('GAV coordinates survive the route round-trip intact'), () => {
    const groupId = 'com.very.long.group';
    const artifactId = 'my-complex-artifact';
    const versionId = '10.20.30';
    const route = generateDataProductNativeRoute(
      groupId,
      artifactId,
      versionId,
      'dp::Path',
      'ap1',
    );
    const match = matchPath(LEGEND_QUERY_ROUTE_PATTERN.DATA_PRODUCT, route);
    expect(match).not.toBeNull();
    const gavParam = (match as NonNullable<typeof match>).params[
      DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV
    ];
    expect(gavParam).toBeDefined();
    const parsed = parseGAVCoordinates(gavParam as string);
    expect(parsed.groupId).toBe(groupId);
    expect(parsed.artifactId).toBe(artifactId);
    expect(parsed.versionId).toBe(versionId);
  });
});
