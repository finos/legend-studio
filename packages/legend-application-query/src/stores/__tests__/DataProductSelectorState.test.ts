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

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { flowResult } from 'mobx';
import {
  DataProductSelectorState,
  buildDataSpaceOrProductOption,
} from '../data-space/DataProductSelectorState.js';
import { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import { DepotEntityWithOrigin } from '@finos/legend-storage';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '@finos/legend-extension-dsl-data-space/graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMockFn = jest.Mock<(...args: any[]) => any>;

const buildMockDepotServerClient = (overrides?: {
  getEntitiesByClassifier?: AnyMockFn;
  getEntitiesSummaryByClassifier?: AnyMockFn;
}): DepotServerClient =>
  ({
    getEntitiesByClassifier:
      overrides?.getEntitiesByClassifier ??
      (jest.fn() as AnyMockFn).mockResolvedValue([]),
    getEntitiesSummaryByClassifier:
      overrides?.getEntitiesSummaryByClassifier ??
      (jest.fn() as AnyMockFn).mockResolvedValue([]),
  }) as unknown as DepotServerClient;

const buildMockApplicationStore = (overrides?: {
  NonProductionFeatureFlag?: boolean;
}): LegendQueryApplicationStore =>
  ({
    config: {
      options: {
        NonProductionFeatureFlag: overrides?.NonProductionFeatureFlag ?? true,
      },
    },
    notificationService: {
      notifyError: jest.fn(),
    },
    logService: {
      error: jest.fn(),
    },
  }) as unknown as LegendQueryApplicationStore;

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

const TEST_DATA__storedDataSpaceEntity = (
  groupId: string,
  artifactId: string,
  versionId: string,
  path: string,
  title?: string,
  defaultExecutionContext?: string,
) => ({
  groupId,
  artifactId,
  versionId,
  entity: {
    classifierPath: DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
    path,
    content: {
      ...(title !== undefined ? { title } : {}),
      ...(defaultExecutionContext !== undefined
        ? { defaultExecutionContext }
        : {}),
    },
  },
});

const TEST_DATA__storedSummaryDataProductEntity = (
  groupId: string,
  artifactId: string,
  versionId: string,
  path: string,
  classifierPath: string,
) => ({
  groupId,
  artifactId,
  versionId,
  path,
  classifierPath,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(unitTest('DataProductSelectorState'), () => {
  let depotClient: DepotServerClient;
  let appStore: LegendQueryApplicationStore;
  let selectorState: DataProductSelectorState;

  beforeEach(() => {
    depotClient = buildMockDepotServerClient();
    appStore = buildMockApplicationStore();
    selectorState = new DataProductSelectorState(depotClient, appStore);
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------

  test(unitTest('has correct initial state'), () => {
    expect(selectorState.legacyDataProducts).toBeUndefined();
    expect(selectorState.dataProducts).toBeUndefined();
    expect(selectorState.isFetchingProducts).toBe(false);
    expect(selectorState.isCompletelyLoaded).toBe(false);
    expect(selectorState.disableDataProducts).toBe(false);
    expect(selectorState.dataProductOptions).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Setters
  // -----------------------------------------------------------------------

  test(unitTest('setLegacyDataProducts updates the field'), () => {
    const dataSpace = new ResolvedDataSpaceEntityWithOrigin(
      { groupId: 'g', artifactId: 'a', versionId: '1.0.0' },
      'My DataSpace',
      'MyDataSpace',
      'model::MyDataSpace',
      'default',
    );
    selectorState.setLegacyDataProducts([dataSpace]);
    expect(selectorState.legacyDataProducts).toHaveLength(1);
    expect(
      (
        selectorState.legacyDataProducts as NonNullable<
          typeof selectorState.legacyDataProducts
        >
      )[0],
    ).toBe(dataSpace);
  });

  test(unitTest('setDataProducts updates the field'), () => {
    const product = new DepotEntityWithOrigin(
      { groupId: 'g', artifactId: 'a', versionId: '1.0.0' },
      'MyProduct',
      'model::MyProduct',
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
    );
    selectorState.setDataProducts([product]);
    expect(selectorState.dataProducts).toHaveLength(1);
    expect(
      (
        selectorState.dataProducts as NonNullable<
          typeof selectorState.dataProducts
        >
      )[0],
    ).toBe(product);
  });

  test(unitTest('clearProducts resets both lists'), () => {
    selectorState.setLegacyDataProducts([]);
    selectorState.setDataProducts([]);
    expect(selectorState.legacyDataProducts).toBeDefined();
    expect(selectorState.dataProducts).toBeDefined();

    selectorState.clearProducts();
    expect(selectorState.legacyDataProducts).toBeUndefined();
    expect(selectorState.dataProducts).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Computed properties
  // -----------------------------------------------------------------------

  test(
    unitTest('isCompletelyLoaded returns true only when both are set'),
    () => {
      expect(selectorState.isCompletelyLoaded).toBe(false);

      selectorState.setLegacyDataProducts([]);
      expect(selectorState.isCompletelyLoaded).toBe(false);

      selectorState.setDataProducts([]);
      expect(selectorState.isCompletelyLoaded).toBe(true);
    },
  );

  // -----------------------------------------------------------------------
  // loadProducts
  // -----------------------------------------------------------------------

  test(
    unitTest('loadProducts fetches both data spaces and data products'),
    async () => {
      const mockDataSpaces = [
        TEST_DATA__storedDataSpaceEntity(
          'org.finos',
          'model-a',
          '1.0.0',
          'model::DataSpaceA',
          'DataSpace A',
          'defaultCtx',
        ),
        TEST_DATA__storedDataSpaceEntity(
          'org.finos',
          'model-b',
          '2.0.0',
          'model::DataSpaceB',
        ),
      ];

      const mockDataProducts = [
        TEST_DATA__storedSummaryDataProductEntity(
          'org.finos',
          'product-x',
          '1.0.0',
          'model::ProductX',
          'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
        ),
      ];

      depotClient = buildMockDepotServerClient({
        getEntitiesByClassifier: (jest.fn() as AnyMockFn).mockResolvedValue(
          mockDataSpaces,
        ),
        getEntitiesSummaryByClassifier: (
          jest.fn() as AnyMockFn
        ).mockResolvedValue(mockDataProducts),
      });
      selectorState = new DataProductSelectorState(depotClient, appStore);

      await flowResult(selectorState.loadProducts());

      // Legacy data products (data spaces)
      expect(selectorState.legacyDataProducts).toHaveLength(2);
      const legacy = selectorState.legacyDataProducts as NonNullable<
        typeof selectorState.legacyDataProducts
      >;
      expect(legacy[0]?.path).toBe('model::DataSpaceA');
      expect(legacy[0]?.title).toBe('DataSpace A');
      expect(legacy[0]?.defaultExecutionContext).toBe('defaultCtx');
      expect(legacy[1]?.path).toBe('model::DataSpaceB');
      expect(legacy[1]?.title).toBeUndefined();

      // Data products
      expect(selectorState.dataProducts).toHaveLength(1);
      expect(
        (
          selectorState.dataProducts as NonNullable<
            typeof selectorState.dataProducts
          >
        )[0]?.path,
      ).toBe('model::ProductX');

      // State flags
      expect(selectorState.loadProductsState.hasSucceeded).toBe(true);
      expect(selectorState.isCompletelyLoaded).toBe(true);
      expect(selectorState.isFetchingProducts).toBe(false);
    },
  );

  test(
    unitTest(
      'loadProducts skips data products when disableDataProducts is true',
    ),
    async () => {
      const mockDataSpaces = [
        TEST_DATA__storedDataSpaceEntity(
          'org.finos',
          'model-a',
          '1.0.0',
          'model::DataSpaceA',
        ),
      ];

      depotClient = buildMockDepotServerClient({
        getEntitiesByClassifier: (jest.fn() as AnyMockFn).mockResolvedValue(
          mockDataSpaces,
        ),
        getEntitiesSummaryByClassifier: jest.fn() as AnyMockFn,
      });
      selectorState = new DataProductSelectorState(depotClient, appStore);
      selectorState.disableDataProducts = true;

      await flowResult(selectorState.loadProducts());

      expect(selectorState.legacyDataProducts).toHaveLength(1);
      expect(selectorState.dataProducts).toHaveLength(0);
      expect(depotClient.getEntitiesSummaryByClassifier).not.toHaveBeenCalled();
      expect(selectorState.loadProductsState.hasSucceeded).toBe(true);
    },
  );

  test(unitTest('loadProducts handles errors gracefully'), async () => {
    const testError = new Error('Network failure');
    depotClient = buildMockDepotServerClient({
      getEntitiesByClassifier: (jest.fn() as AnyMockFn).mockRejectedValue(
        testError,
      ),
    });
    selectorState = new DataProductSelectorState(depotClient, appStore);

    await flowResult(selectorState.loadProducts());

    expect(selectorState.loadProductsState.hasFailed).toBe(true);
    expect(selectorState.isFetchingProducts).toBe(false);
    const notificationSvc = appStore.notificationService as unknown as Record<
      string,
      AnyMockFn
    >;
    expect(notificationSvc.notifyError).toHaveBeenCalledWith(testError);
    const logSvc = appStore.logService as unknown as Record<string, AnyMockFn>;
    expect(logSvc.error).toHaveBeenCalled();
    // Products remain unset on error
    expect(selectorState.legacyDataProducts).toBeUndefined();
    expect(selectorState.dataProducts).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // dataProductOptions
  // -----------------------------------------------------------------------

  test(
    unitTest('dataProductOptions combines legacy and new data products'),
    () => {
      const dataSpace = new ResolvedDataSpaceEntityWithOrigin(
        { groupId: 'g', artifactId: 'a', versionId: '1.0.0' },
        'My DataSpace Title',
        'MyDataSpace',
        'model::MyDataSpace',
        'default',
      );
      const product = new DepotEntityWithOrigin(
        { groupId: 'g', artifactId: 'b', versionId: '2.0.0' },
        'MyProduct',
        'model::MyProduct',
        'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
      );

      selectorState.setLegacyDataProducts([dataSpace]);
      selectorState.setDataProducts([product]);

      const options = selectorState.dataProductOptions;
      expect(options).toHaveLength(2);
      // Legacy (dataspace) option comes first
      expect(options[0]?.label).toBe('My DataSpace Title');
      expect(options[0]?.value).toBe(dataSpace);
      // Data product option comes second
      expect(options[1]?.label).toBe('MyProduct');
      expect(options[1]?.value).toBe(product);
    },
  );

  test(
    unitTest('dataProductOptions returns empty when lists are undefined'),
    () => {
      expect(selectorState.dataProductOptions).toEqual([]);
    },
  );

  test(
    unitTest('dataProductOptions returns empty when lists are empty'),
    () => {
      selectorState.setLegacyDataProducts([]);
      selectorState.setDataProducts([]);
      expect(selectorState.dataProductOptions).toEqual([]);
    },
  );
});

// ---------------------------------------------------------------------------
// buildDataSpaceOrProductOption helper
// ---------------------------------------------------------------------------

describe(unitTest('buildDataSpaceOrProductOption'), () => {
  test(
    unitTest('uses title for ResolvedDataSpaceEntityWithOrigin when available'),
    () => {
      const entity = new ResolvedDataSpaceEntityWithOrigin(
        { groupId: 'g', artifactId: 'a', versionId: '1.0.0' },
        'Custom Title',
        'EntityName',
        'model::EntityName',
        undefined,
      );
      const option = buildDataSpaceOrProductOption(entity);
      expect(option.label).toBe('Custom Title');
      expect(option.value).toBe(entity);
    },
  );

  test(
    unitTest(
      'falls back to name for ResolvedDataSpaceEntityWithOrigin without title',
    ),
    () => {
      const entity = new ResolvedDataSpaceEntityWithOrigin(
        { groupId: 'g', artifactId: 'a', versionId: '1.0.0' },
        undefined,
        'EntityName',
        'model::EntityName',
        undefined,
      );
      const option = buildDataSpaceOrProductOption(entity);
      expect(option.label).toBe('EntityName');
    },
  );

  test(unitTest('uses name for DepotEntityWithOrigin'), () => {
    const entity = new DepotEntityWithOrigin(
      { groupId: 'g', artifactId: 'a', versionId: '1.0.0' },
      'ProductName',
      'model::ProductName',
      'some::classifierPath',
    );
    const option = buildDataSpaceOrProductOption(entity);
    expect(option.label).toBe('ProductName');
    expect(option.value).toBe(entity);
  });
});
