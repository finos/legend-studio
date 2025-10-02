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

import { beforeEach, expect, jest, test } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { createSpy } from '@finos/legend-shared/test';
import { CORE_PURE_PATH } from '@finos/legend-graph';
import {
  mockDataProducts,
  mockReleaseSDLCDataProduct,
  mockSnapshotSDLCDataProduct,
} from '../../components/__test-utils__/TEST_DATA__LakehouseData.js';
import type { LegendMarketplaceApplicationConfigurationData } from '../../application/LegendMarketplaceApplicationConfig.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('swiper/react', () => ({
  Swiper: ({}) => <div></div>,
  SwiperSlide: ({}) => <div></div>,
}));

jest.mock('swiper/modules', () => ({
  Navigation: ({}) => <div></div>,
  Pagination: ({}) => <div></div>,
  Autoplay: ({}) => <div></div>,
}));

const setupTestComponent = async (
  query?: string,
  extraConfigData?: Partial<LegendMarketplaceApplicationConfigurationData>,
) => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    extraConfigData,
  });
  jest
    .spyOn(
      MOCK__baseStore.applicationStore.navigationService.navigator,
      'getCurrentAddress',
    )
    .mockReturnValue('http://localhost/dataProduct/results?query=data');

  createSpy(
    MOCK__baseStore.lakehouseContractServerClient,
    'getDataProducts',
  ).mockResolvedValue(mockDataProducts);
  createSpy(
    MOCK__baseStore.depotServerClient,
    'getVersionEntities',
  ).mockImplementation(
    async (
      groupId: string,
      artifactId: string,
      versionId: string,
      classifierPath?: string,
    ) => {
      if (
        groupId === 'com.example.analytics' &&
        artifactId === 'customer-analytics'
      ) {
        return [
          {
            entity: {
              classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
              content: mockReleaseSDLCDataProduct,
              path: 'test::dataproduct::TestSDLCDataProduct',
            },
          },
        ];
      } else if (
        groupId === 'com.example.finance' &&
        artifactId === 'financial-reporting'
      ) {
        return [
          {
            entity: {
              classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
              content: mockSnapshotSDLCDataProduct,
              path: 'test::dataproduct::AnotherSDLCDataProduct',
            },
          },
        ];
      }
      throw new Error(
        `Unable to find entities at: ${groupId}:${artifactId}:${versionId}:${classifierPath}`,
      );
    },
  );
  createSpy(
    MOCK__baseStore.depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockResolvedValue([]);

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    MOCK__baseStore,
    `/dataProduct/results?query=${query ?? 'data'}`,
  );

  return { MOCK__baseStore, renderResult };
};

beforeEach(() => {
  localStorage.clear();
});

test('renders search box pre-filled based on URL query param', async () => {
  await setupTestComponent();

  expect(screen.getByDisplayValue('data')).toBeDefined();
});

test('displays cards for SDLC data products', async () => {
  await setupTestComponent();

  // Check for SLDC data products
  await screen.findAllByText('SDLC Release Data Product');
  screen.getByText('1.2.0');
  screen.getByText('PRODUCTION');
  screen.getByText(
    'Comprehensive customer analytics data for business intelligence and reporting',
  );

  // Check that SDLC data product without title uses ID
  await screen.findAllByText('SDLC_SNAPSHOT_DATAPRODUCT');
  screen.getByText('master-SNAPSHOT');
  screen.getByText('PRODUCTION_PARALLEL');
});

test('shows info popper for SDLC data products with correct details', async () => {
  await setupTestComponent();

  const findDataProductTitle = await screen.findAllByText(
    'SDLC Release Data Product',
  );
  const dataProductTitle = guaranteeNonNullable(findDataProductTitle[0]);
  const dataProductCard = guaranteeNonNullable(
    dataProductTitle.parentElement?.parentElement,
  );

  fireEvent.mouseEnter(dataProductCard);

  const infoButton = screen.getByRole('button', { name: 'More Info' });

  fireEvent.click(guaranteeNonNullable(infoButton));

  await screen.findByText('Description');
  expect(
    screen.getAllByText(
      'Comprehensive customer analytics data for business intelligence and reporting',
    ),
  ).toHaveLength(2);

  screen.getByText('Deployment Details');
  screen.getByText('Data Product ID');
  screen.getByText('SDLC_RELEASE_DATAPRODUCT');
  screen.getByText('Deployment ID');
  screen.getByText('12345');
  screen.getByText('Producer Environment Name');
  screen.getByText('production-analytics');
  screen.getByText('Producer Environment Type');
  expect(screen.getAllByText('PRODUCTION')).toHaveLength(2);

  screen.getByText('Data Product Project');
  screen.getByText('Group');
  screen.getByText('com.example.analytics');
  screen.getByText('Artifact');
  screen.getByText('customer-analytics');
  screen.getByText('Version');
  expect(screen.getAllByText('1.2.0')).toHaveLength(2);
  screen.getByText('Path');
  screen.getByText('test::dataproduct::Sdlc_Release_DataProduct');
});

test('filters data products by name based on query param', async () => {
  await setupTestComponent('release');

  await screen.findAllByText('SDLC Release Data Product');
  expect(screen.queryByText('SDLC_SNAPSHOT_DATAPRODUCT')).toBeNull();
});

test('Sort dropdown correctly sorts and filters data products', async () => {
  await setupTestComponent();

  // Check sort option displays
  const sortDropdown = screen.getByText('Sort');
  fireEvent.mouseDown(sortDropdown);
  screen.getByText('Name A-Z');
  screen.getByText('Name Z-A');
});

test('Production environment only displays production data products', async () => {
  await setupTestComponent(undefined, { env: 'prod' });

  expect(await screen.findAllByText('SDLC Release Data Product')).toHaveLength(
    2,
  );
  expect(screen.queryByText('SDLC_SNAPSHOT_DATAPRODUCT')).toBeNull();
});

test('Production-parallel environment only displays production-parallel data products', async () => {
  await setupTestComponent(undefined, { env: 'prod-par' });

  expect(await screen.findAllByText('SDLC_SNAPSHOT_DATAPRODUCT')).toHaveLength(
    2,
  );
  expect(screen.queryByText('SDLC Release Data Product')).toBeNull();
});

test('Lower environments display all data products', async () => {
  await setupTestComponent();

  expect(await screen.findAllByText('SDLC Release Data Product')).toHaveLength(
    2,
  );
  expect(await screen.findAllByText('SDLC_SNAPSHOT_DATAPRODUCT')).toHaveLength(
    2,
  );
});

test('Clicking on SDLC data product card navigates to data product viewer page', async () => {
  const { MOCK__baseStore } = await setupTestComponent();

  const mockGoToLocation = jest.fn();
  MOCK__baseStore.applicationStore.navigationService.navigator.goToLocation =
    mockGoToLocation;

  const findDataProductTitle = await screen.findAllByText(
    'SDLC Release Data Product',
  );
  const dataProductTitle = guaranteeNonNullable(findDataProductTitle[0]);
  fireEvent.click(dataProductTitle);

  expect(mockGoToLocation).toHaveBeenCalledWith(
    '/dataProduct/deployed/SDLC_RELEASE_DATAPRODUCT/12345',
  );
});
