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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import {
  guaranteeNonNullable,
  LegendUser,
  UserSearchService,
} from '@finos/legend-shared';
import type * as LegendApplication from '@finos/legend-application';
import {
  type V1_BatchLambdaRelationTypeResponse,
  type V1_RelationElement,
} from '@finos/legend-graph';
import {
  getMockDataProductGenerationFilesByType,
  mockEntitlementsAdHocDataProduct,
  mockEntitlementsLargeSDLCDataProduct,
  mockEntitlementsMultiGroupLargeSDLCDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockEntitlementsSDLCDataProductNoSupportInfo,
  mockLargeSDLCDataProduct,
  mockMultiGroupLargeSDLCDataProduct,
  mockSDLCDataProduct,
  mockSDLCDataProductNoSupportInfo,
  mockSDLCDataProductDescriptionsAsTitles,
  mockEntitlementsUntitledSDLCDataProduct,
  mockUntitledSDLCDataProduct,
  mockUntitledSDLCDataProductNamedAsDeployed,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import type { DataProductAPGState } from '../../stores/DataProduct/DataProductAPGState.js';
import type { DataProductAccessPointState } from '../../stores/DataProduct/DataProductAccessPointState.js';
import {
  QUALITY_LEVEL,
  type DataProductQualityResponse,
} from '@finos/legend-server-marketplace';
import {
  MockedMonacoEditorAPI,
  MockedMonacoEditorInstance,
  MockedMonacoEditorModel,
} from '@finos/legend-lego/code-editor/test';
import { setupLakehouseDataProductTest } from './DataProductViewerTestUtils.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
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

jest.mock('react-dnd', () => ({
  useDrop: () => [{ isOver: false }, jest.fn()],
  useDrag: () => [{}, jest.fn()],
}));

jest.mock('@finos/legend-application', () => ({
  ...jest.requireActual<typeof LegendApplication>('@finos/legend-application'),
  useApplicationStore: jest.fn().mockReturnValue({
    layoutService: {
      TEMPORARY__isLightColorThemeEnabled: true,
    },
    pluginManager: {
      getApplicationPlugins: jest.fn().mockReturnValue([]),
    },
  }),
}));

describe('DataProductViewer', () => {
  describe('Basic rendering', () => {
    test('Loads DataProductViewer and displays title, description, and access point groups', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');
      screen.getByText(
        'Comprehensive customer analytics data for business intelligence and reporting',
      );
      screen.getByText('Main Group Test');
      screen.getByText('Test access point group');
      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
    });

    test('Loads DataProductViewer without DataProductDataAccessState and displays title, description, and access point groups', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');
      screen.getByText(
        'Comprehensive customer analytics data for business intelligence and reporting',
      );
      screen.getByText('Main Group Test');
      screen.getByText('Test access point group');
      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
    });

    test('Access Point Column Specifications table shows columns and types from artifact when data product artifact is present', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
        getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
      );

      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
      screen.getByText('Main Group Test');
      await screen.findByText('Column Name');
      screen.getByText('Column Type');
      screen.getByText('Column Description');

      await screen.findByText('artifact_varchar_val');
      screen.getByText('Varchar(500)');
      screen.getByText('artifact_int_val');
      screen.getByText('Int');
    });

    test('Access Point Column Specifications table shows columns and types from engine for SDLC data product when data product artifact is not present', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
      );

      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
      screen.getByText('Main Group Test');

      await screen.findByText('Column Name');
      screen.getByText('Column Type');
      screen.getByText('Column Description');

      await screen.findByText('varchar_val');
      screen.getByText('Varchar(32)');
      screen.getByText('int_val');
      screen.getByText('Int');
    });

    test('Access Point Column Specifications table shows columns and types from engine for ad-hoc data product when data product artifact is not present', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsAdHocDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
      await screen.findByText('Main Group Test');

      await screen.findByText('Column Name');
      screen.getByText('Column Type');
      screen.getByText('Column Description');

      await screen.findByText('varchar_val');
      screen.getByText('Varchar(32)');
      screen.getByText('int_val');
      screen.getByText('Int');
    });

    describe('Access Point relation type failures', () => {
      const ENGINE_ERROR_MESSAGE =
        "Can't find table 'NOPE' in schema 'NORTHWIND' and database 'NorthwindDatabase'";
      const BATCH_ERROR_MESSAGE = 'Engine is unavailable';
      // engine answers with an error for the only access point of `mockSDLCDataProduct`
      const perKeyEngineError =
        async (): Promise<V1_BatchLambdaRelationTypeResponse> => ({
          result: {},
          errors: {
            'GROUP1::customer_demographics': {
              message: ENGINE_ERROR_MESSAGE,
              sourceInformation: {
                sourceId: '',
                startLine: 1,
                startColumn: 2,
                endLine: 1,
                endColumn: 66,
              },
              status: 'error',
            },
          },
        });
      const batchFailure =
        async (): Promise<V1_BatchLambdaRelationTypeResponse> => {
          throw new Error(BATCH_ERROR_MESSAGE);
        };

      // NOTE: here the columns screen mounts after the artifact has loaded, so
      // the race where the engine failure settles first is covered in
      // `DataProductAccessPointState.test.ts`
      test.each([
        ['an engine error for the access point', perKeyEngineError],
        ['a failed batch call', batchFailure],
      ])(
        'Column Specifications table shows columns from artifact when the engine returns %s',
        async (_, batchLambdasRelationType) => {
          const { notifyErrorSpy } = await setupLakehouseDataProductTest(
            mockSDLCDataProduct,
            mockEntitlementsSDLCDataProduct,
            [],
            [],
            {
              groupId: 'test.group',
              artifactId: 'test-artifact',
              versionId: '1.0.0',
            },
            getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
            undefined,
            undefined,
            { batchLambdasRelationType },
          );

          await screen.findByText('Column Name');
          await screen.findByText('artifact_varchar_val');
          screen.getByText('Varchar(500)');
          screen.getByText('artifact_int_val');
          expect(notifyErrorSpy).not.toHaveBeenCalledWith(
            expect.stringContaining(
              'Error fetching access point relation type',
            ),
          );
        },
      );

      test.each([
        [
          'an engine error for the access point',
          perKeyEngineError,
          ENGINE_ERROR_MESSAGE,
        ],
        ['a failed batch call', batchFailure, BATCH_ERROR_MESSAGE],
      ])(
        'Notifies the engine error when there is no artifact and the engine returns %s',
        async (_, batchLambdasRelationType, expectedMessage) => {
          // ad-hoc data product: no artifact to fall back on
          const { notifyErrorSpy } = await setupLakehouseDataProductTest(
            mockSDLCDataProduct,
            mockEntitlementsAdHocDataProduct,
            [],
            [],
            undefined,
            undefined,
            undefined,
            undefined,
            { batchLambdasRelationType },
          );

          await screen.findByText('Column Name');
          await waitFor(() =>
            expect(notifyErrorSpy).toHaveBeenCalledWith(
              `Error fetching access point relation type: ${expectedMessage}`,
            ),
          );
          expect(screen.queryByText('varchar_val')).toBeNull();
        },
      );
    });

    test('Renders button with Lakehouse environment name', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');

      // Wait for the environment to be fetched and displayed
      await screen.findByText(/Lakehouse - test-production-env/);
    });

    test('Clicking owners button displays tooltip with owners', async () => {
      // Pre-populate a UserSearchService so the owners tooltip resolves each
      // owner id (previously the tooltip fell back to rendering the raw id,
      // but with `hideIfNotFound` enabled we now hide unresolved users).
      const ownerIds = [
        'owner1@example.com',
        'owner2@example.com',
        'owner3@example.com',
      ];
      const userSearchService = new UserSearchService({});
      ownerIds.forEach((ownerId) => {
        const user = new LegendUser(ownerId, ownerId);
        userSearchService.setUser(ownerId, user);
      });

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        undefined,
        userSearchService,
      );

      await screen.findByText('Mock SDLC Data Product');

      // Wait for the environment label to be rendered
      await screen.findByText(/Lakehouse - test-production-env/);

      // Click on the owners button (avatar group) to open the tooltip
      const ownersButton = await screen.findByText('Owners');
      await act(async () => {
        fireEvent.click(ownersButton);
      });

      // Wait for the tooltip to appear with owners
      await waitFor(() => {
        expect(screen.getByText('owner1@example.com')).toBeDefined();
        expect(screen.getByText('owner2@example.com')).toBeDefined();
        expect(screen.getByText('owner3@example.com')).toBeDefined();
      });
    });

    test('renders the quality badge and AI-Ready stamp when fetchDataProductQuality is wired up', async () => {
      const qualityResult: DataProductQualityResponse = {
        qualityLevel: QUALITY_LEVEL.DIAMOND,
        qualityBreakdown: {
          isDescriptionDocumented: true,
          isAccessPointsPresent: true,
          isAccessPointGroupDescriptionsDocumented: true,
          isEveryAccessPointDocumented: true,
          attributeCoverage: 1,
          documentedAttributeCount: 10,
          totalAttributeCount: 10,
        },
      };

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { fetchDataProductQuality: async () => qualityResult },
      );

      await waitFor(() => {
        expect(screen.getByText(/AI Readiness Badge:/)).toBeDefined();
      });
      expect(screen.getByText('AI-Ready')).toBeDefined();
    });

    test('renders no quality badge when fetchDataProductQuality is not wired up', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      expect(screen.queryByText(/AI Readiness Badge:/)).toBeNull();
    });
  });

  describe('IDs next to titles', () => {
    let writeText: jest.Mock<(text: string) => Promise<void>>;

    beforeEach(() => {
      // jsdom has no clipboard
      writeText = jest
        .fn<(text: string) => Promise<void>>()
        .mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, 'clipboard');
    });

    // the button that copies an ID is named "Copy {label} {ID}"
    const getCopyableId = (label: string, id: string): HTMLElement =>
      screen.getByRole('button', { name: `Copy ${label} ${id}` });

    // waits for the tooltip to say "Copied", which also flushes the state update
    const copy = async (button: HTMLElement): Promise<void> => {
      fireEvent.click(button);
      await waitFor(() =>
        expect(button.classList.contains('copyable-id--copied')).toBe(true),
      );
    };

    test('shows the data product, deployment, access point group and access point IDs', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');
      // the deployed data product ID, not the element name (Mock_SDLC_DataProduct)
      expect(
        getCopyableId('data product ID', 'MOCK_SDLC_DATAPRODUCT').textContent,
      ).toBe('MOCK_SDLC_DATAPRODUCT');
      expect(screen.queryByText('Mock_SDLC_DataProduct')).toBeNull();
      expect(getCopyableId('deployment ID', '11111').textContent).toBe(
        'DID 11111',
      );
      screen.getByText('Main Group Test');
      expect(getCopyableId('access point group ID', 'GROUP1').textContent).toBe(
        'GROUP1',
      );
      await screen.findByText('Customer Demographics');
      expect(
        getCopyableId('access point ID', 'customer_demographics').textContent,
      ).toBe('customer_demographics');
    });

    test('shows no IDs in the header without a deployment', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');
      expect(
        screen.queryByRole('button', {
          name: /^Copy (?:data product|deployment) ID /,
        }),
      ).toBeNull();
      getCopyableId('access point group ID', 'GROUP1');
      await screen.findByText('Customer Demographics');
      getCopyableId('access point ID', 'customer_demographics');
    });

    test('shows no extra ID when the title is missing, since the ID shows in its place', async () => {
      await setupLakehouseDataProductTest(
        mockUntitledSDLCDataProductNamedAsDeployed,
        mockEntitlementsUntitledSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Data product without titles');
      expect(screen.getAllByText('MOCK_UNTITLED_DATAPRODUCT')).toHaveLength(1);
      expect(screen.getAllByText('UNTITLED_GROUP')).toHaveLength(1);
      expect(await screen.findAllByText('untitled_access_point')).toHaveLength(
        1,
      );
      expect(
        screen.queryByRole('button', {
          name: /^Copy (?:data product|access point group|access point) ID /,
        }),
      ).toBeNull();
      getCopyableId('deployment ID', '66666');
    });

    test('shows the deployed data product ID when the title is missing and the element name differs from it', async () => {
      await setupLakehouseDataProductTest(
        mockUntitledSDLCDataProduct,
        mockEntitlementsUntitledSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Mock_Untitled_DataProduct');
      getCopyableId('data product ID', 'MOCK_UNTITLED_DATAPRODUCT');
      getCopyableId('deployment ID', '66666');
    });

    test('copies each ID on click without collapsing its access point group or access point', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );
      const apgState = guaranteeNonNullable(
        dataProductViewerState.apgStates[0],
      );
      const accessPointState = guaranteeNonNullable(
        apgState.accessPointStates[0],
      );
      await screen.findByText('Customer Demographics');

      const ids = [
        ['data product ID', 'MOCK_SDLC_DATAPRODUCT'],
        ['deployment ID', '11111'],
        ['access point group ID', 'GROUP1'],
        ['access point ID', 'customer_demographics'],
      ] as const;
      for (const [label, id] of ids) {
        await copy(getCopyableId(label, id));
        expect(writeText).toHaveBeenLastCalledWith(id);
      }
      expect(writeText).toHaveBeenCalledTimes(ids.length);
      expect(apgState.isCollapsed).toBe(false);
      expect(accessPointState.isCollapsed).toBe(false);
    });

    test('copies an access point ID on click without expanding the access point', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockLargeSDLCDataProduct,
        mockEntitlementsLargeSDLCDataProduct,
        [],
        [],
      );
      const accessPointState = guaranteeNonNullable(
        dataProductViewerState.apgStates[0]?.accessPointStates[0],
      );
      expect(accessPointState.isCollapsed).toBe(true);
      await screen.findByText('Access Point 1');

      await copy(getCopyableId('access point ID', 'ap_1'));

      expect(writeText).toHaveBeenCalledWith('ap_1');
      expect(accessPointState.isCollapsed).toBe(true);
      expect(screen.queryAllByText('Column Name')).toHaveLength(0);
    });
  });

  describe('Descriptions that repeat the title', () => {
    test('shows only the title when the description repeats it, ignoring case and spacing', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductDescriptionsAsTitles,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');
      expect(screen.queryByText('mock SDLC data product')).toBeNull();
      expect(screen.queryByText('(description not specified)')).toBeNull();
      expect(screen.getAllByText('Main Group Test')).toHaveLength(1);
      expect(await screen.findAllByText('Customer Demographics')).toHaveLength(
        1,
      );
      expect(screen.queryByText('No description to provide')).toBeNull();
    });
  });

  describe('Support info rendering', () => {
    test('Renders support info correctly', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Support');

      // Confirm all emails render
      await screen.findByText('Person 1 Email');
      screen.getByText('Person 2 Email');

      // Confirm support info with label renders label
      screen.getByText('Documentation Link Label');

      // Confirm support info without label renders URL
      screen.getByText('https://example-website.com');
    });

    test('Renders placeholder if no support info is available', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductNoSupportInfo,
        mockEntitlementsSDLCDataProductNoSupportInfo,
        [],
        [],
      );

      await screen.findByText('Support');

      await screen.findByText('(support information not specified)');
    });
  });

  describe('Registry metadata (ADS/PDE tags)', () => {
    test('Displays ADS tag when access point has ads=true in registry metadata', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id',
          ads: true,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const adsChip = await screen.findByTitle('Authorized Data Source');
      expect(adsChip.textContent).toBe('ADS');
    });

    test('Displays PDE tag when access point has pde=true in registry metadata', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id',
          ads: false,
          pde: true,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const pdeChip = await screen.findByTitle('Point of Data Entry');
      expect(pdeChip.textContent).toBe('PDE');
    });

    test('Displays both ADS and PDE tags when access point has both in registry metadata', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id',
          ads: true,
          pde: true,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const adsChip = await screen.findByTitle('Authorized Data Source');
      expect(adsChip.textContent).toBe('ADS');
      const pdeChip = screen.getByTitle('Point of Data Entry');
      expect(pdeChip.textContent).toBe('PDE');
    });

    test('Does not display tags when access point has ads=false and pde=false in registry metadata', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');
      expect(screen.queryByTitle('Authorized Data Source')).toBeNull();
      expect(screen.queryByTitle('Point of Data Entry')).toBeNull();
    });

    test('Does not display tags when registry metadata fetch fails', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockRejectedValue(new Error('Registry fetch failed'));
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      expect(screen.queryByTitle('Authorized Data Source')).toBeNull();
      expect(screen.queryByTitle('Point of Data Entry')).toBeNull();
    });

    test('Handles registry server client being undefined gracefully', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      (
        dataProductViewerState as { registryServerClient?: unknown }
      ).registryServerClient = undefined;
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      expect(screen.queryByTitle('Authorized Data Source')).toBeNull();
      expect(screen.queryByTitle('Point of Data Entry')).toBeNull();
    });
  });

  describe('Auto-collapse threshold', () => {
    test('Below threshold: APGs and APs are expanded', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      // Verify state is expanded
      expect(dataProductViewerState.apgStates[0]?.isCollapsed).toBe(false);
      expect(
        dataProductViewerState.apgStates[0]?.accessPointStates[0]?.isCollapsed,
      ).toBe(false);

      // Verify component rendering
      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Main Group Test');
      await screen.findByText('Customer Demographics');
    });

    test('Above threshold, 1 APG: APG expanded, APs collapsed', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockLargeSDLCDataProduct,
        mockEntitlementsLargeSDLCDataProduct,
        [],
        [],
      );

      // Verify APG is expanded
      expect(dataProductViewerState.apgStates[0]?.isCollapsed).toBe(false);

      // Verify all APs are collapsed
      dataProductViewerState.apgStates[0]?.accessPointStates.forEach((ap) => {
        expect(ap.isCollapsed).toBe(true);
      });

      // Verify APG title is visible
      await screen.findByText('Large Group');
      // Verify APs titles are visible (MUI Accordion Summary renders them even if collapsed)
      await screen.findByText('Access Point 1');
      await screen.findByText('Access Point 21');

      // Verify AP details content isn't visible
      expect(screen.queryAllByText('Column Name').length).toBe(0);
    });

    test('Above threshold, >1 APG: all APGs collapsed', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      // Verify all APGs are collapsed
      expect(dataProductViewerState.apgStates[0]?.isCollapsed).toBe(true);
      expect(dataProductViewerState.apgStates[1]?.isCollapsed).toBe(true);

      // Verify APG titles are visible
      await screen.findByText('Group A');
      await screen.findByText('Group B');

      // Verify APs are not visible because the APG is collapsed and content is not rendered
      expect(screen.queryByText('Access Point 1')).toBeNull();
    });

    test('Expanding a collapsed APG shows collapsed APs', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      // APG starts collapsed, APs are not visible
      expect(screen.queryByText('Access Point 1')).toBeNull();

      // Find the expand button for the first APG and click it
      const expandButtons = await screen.findAllByRole('button', {
        name: 'Expand',
      });
      fireEvent.click(expandButtons[0] as HTMLElement);

      // Now APG should be expanded, and APs should be visible (but titles only, details collapsed)
      expect(dataProductViewerState.apgStates[0]?.isCollapsed).toBe(false);
      await screen.findByText('Access Point 1');

      // APs are collapsed by default in this case
      expect(
        dataProductViewerState.apgStates[0]?.accessPointStates[0]?.isCollapsed,
      ).toBe(true);
    });
  });

  describe('Search text filtering', () => {
    test('Empty search text returns all APG states', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Group A');
      await screen.findByText('Group B');
    });

    test('Search text by APG ID filters correctly', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      const searchInput = await screen.findByPlaceholderText(
        'Filter access point groups/access points...',
      );
      fireEvent.change(searchInput, { target: { value: 'MULTI_GROUP_A' } });

      await screen.findByText('Group A');
      expect(screen.queryByText('Group B')).toBeNull();
      fireEvent.change(searchInput, { target: { value: 'MULTI_GROUP_B' } });

      await screen.findByText('Group B');
      expect(screen.queryByText('Group A')).toBeNull();
    });

    test('Search text by AP title filters correctly', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      // Searching for 'group_b_ap_1'
      const searchInput = await screen.findByPlaceholderText(
        'Filter access point groups/access points...',
      );
      fireEvent.change(searchInput, { target: { value: 'group_b_ap_1' } });

      await screen.findByText('Group B');
      expect(screen.queryByText('Group A')).toBeNull();
    });

    test('Search text with no matches returns empty', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      const searchInput = await screen.findByPlaceholderText(
        'Filter access point groups/access points...',
      );
      fireEvent.change(searchInput, {
        target: { value: 'nonexistent_search_query' },
      });

      expect(screen.queryByText('Group A')).toBeNull();
      expect(screen.queryByText('Group B')).toBeNull();
    });
  });

  describe('Deferred initialization', () => {
    test('Data is fetched only when the respective tab is selected', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      const apgState = dataProductViewerState
        .apgStates[0] as DataProductAPGState;
      const apState = apgState
        .accessPointStates[0] as DataProductAccessPointState;

      // Ensure that we have a promise set up by init
      act(() => {
        dataProductViewerState.dataProductArtifactPromise =
          Promise.resolve(undefined);
      });

      // Mock the fetches to return a promise that never resolves.
      // This prevents the UI from actually attempting to render the result (like CodeEditor or DataGrid),
      // which might crash in the mocked JSDOM environment, while still allowing us to verify the method was called.
      const fetchRelationTypeSpy = jest
        .spyOn(apState, 'fetchRelationType')
        .mockImplementation(() => {
          apState.fetchingRelationTypeState.inProgress();
          return new Promise(() => {});
        });
      const fetchGrammarSpy = jest
        .spyOn(apState, 'fetchGrammar')
        .mockImplementation(() => {
          apState.fetchingGrammarState.inProgress();
          return new Promise(() => {});
        });
      const fetchRegistryMetadataSpy = jest
        .spyOn(apState, 'fetchRegistryMetadata')
        .mockImplementation(() => {
          apState.fetchingRegistryMetadataState.inProgress();
          return new Promise(() => {});
        });

      // Find the expand button for the first APG and click it
      const expandAPGButtons = await screen.findAllByRole('button', {
        name: 'Expand',
      });
      await act(async () => {
        fireEvent.click(expandAPGButtons[0] as HTMLElement);
      });

      // Expand the first Access Point
      const apSummary = await screen.findByText('Access Point 1');
      await act(async () => {
        fireEvent.click(apSummary);
      });

      // Assert that Columns tab fetch happens immediately (default tab)
      await waitFor(() => {
        expect(fetchRelationTypeSpy).toHaveBeenCalledTimes(1);
      });

      // Definition and Governance fetches should not have been called yet
      expect(fetchGrammarSpy).not.toHaveBeenCalled();
      expect(fetchRegistryMetadataSpy).not.toHaveBeenCalled();

      // Pure Query shows the accessor, not the definition
      jest.spyOn(MockedMonacoEditorAPI, 'create').mockReturnValue({
        ...MockedMonacoEditorInstance,
        getValue: jest.fn().mockReturnValue(''),
      });
      jest
        .spyOn(MockedMonacoEditorAPI, 'createModel')
        .mockReturnValue(MockedMonacoEditorModel);
      // NOTE: the queries below are by text: on this data product's large page,
      // a query by role takes seconds on a slow machine
      await act(async () => {
        fireEvent.click(await screen.findByText('Pure Query'));
      });
      await screen.findByText('Accessor');
      expect(fetchGrammarSpy).not.toHaveBeenCalled();

      // Open the definition in Column Specifications
      await act(async () => {
        fireEvent.click(await screen.findByText('Column Specifications'));
      });
      await act(async () => {
        fireEvent.click(await screen.findByText('View definition'));
      });

      // Assert that the definition fetch happens
      await waitFor(() => {
        expect(fetchGrammarSpy).toHaveBeenCalledTimes(1);
      });
      expect(fetchRegistryMetadataSpy).not.toHaveBeenCalled();

      // Click on Governance tab
      const governanceTab = await screen.findByText('Governance');
      await act(async () => {
        fireEvent.click(governanceTab);
      });

      // Assert that Governance fetch happens
      await waitFor(() => {
        expect(fetchRegistryMetadataSpy).toHaveBeenCalledTimes(1);
      });

      // Ensure they were all called exactly once despite interacting with tabs again
      await act(async () => {
        fireEvent.click(await screen.findByText('Column Specifications'));
      });
      await act(async () => {
        fireEvent.click(await screen.findByText('View definition'));
      });
      await act(async () => {
        fireEvent.click(await screen.findByText('Hide definition'));
      });
      await act(async () => {
        fireEvent.click(await screen.findByText('View definition'));
      });
      await act(async () => {
        fireEvent.click(await screen.findByText('Governance'));
      });

      expect(fetchRelationTypeSpy).toHaveBeenCalledTimes(1);
      expect(fetchGrammarSpy).toHaveBeenCalledTimes(1);
      expect(fetchRegistryMetadataSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchSampleData logic', () => {
    test('uses engine result when both engine and artifact promises resolve successfully', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );
      const apState = dataProductViewerState.apgStates[0]
        ?.accessPointStates[0] as DataProductAccessPointState;

      const engineEle = {
        _type: 'relationElement',
        columns: ['engine_col'],
      } as unknown as V1_RelationElement;
      const artifactEle = {
        _type: 'relationElement',
        columns: ['artifact_col'],
      } as unknown as V1_RelationElement;

      jest
        .spyOn(apState, 'fetchSampleDataFromEngine')
        .mockResolvedValue(engineEle);
      jest
        .spyOn(apState, 'fetchSampleDataFromArtifact')
        .mockResolvedValue(artifactEle);

      expect(apState.fetchingSampleDataState.isInInitialState).toBe(true);

      await apState.fetchSampleData(
        Promise.resolve(undefined),
        'test-env-name',
      );

      expect(apState.relationElement).toEqual(engineEle);
    });

    test('uses artifact result when engine promise fails but artifact promise resolves successfully', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );
      const apState = dataProductViewerState.apgStates[0]
        ?.accessPointStates[0] as DataProductAccessPointState;

      const artifactEle = {
        _type: 'relationElement',
        columns: ['artifact_col'],
      } as unknown as V1_RelationElement;

      jest
        .spyOn(apState, 'fetchSampleDataFromEngine')
        .mockRejectedValue(new Error('Engine failed'));
      jest
        .spyOn(apState, 'fetchSampleDataFromArtifact')
        .mockResolvedValue(artifactEle);

      await apState.fetchSampleData(
        Promise.resolve(undefined),
        'test-env-name',
      );

      expect(apState.relationElement).toEqual(artifactEle);
    });

    test('only requests engine if artifact promise is not provided', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );
      const apState = dataProductViewerState.apgStates[0]
        ?.accessPointStates[0] as DataProductAccessPointState;

      const engineEle = {
        _type: 'relationElement',
        columns: ['engine_col'],
      } as unknown as V1_RelationElement;

      const engineSpy = jest
        .spyOn(apState, 'fetchSampleDataFromEngine')
        .mockResolvedValue(engineEle);
      const artifactSpy = jest.spyOn(apState, 'fetchSampleDataFromArtifact');

      await apState.fetchSampleData(undefined, 'test-env-name');

      expect(apState.relationElement).toEqual(engineEle);
      expect(engineSpy).toHaveBeenCalledWith('test-env-name');
      expect(artifactSpy).not.toHaveBeenCalled();
    });

    test('only requests artifact if resolvedUserEnv is not provided', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );
      const apState = dataProductViewerState.apgStates[0]
        ?.accessPointStates[0] as DataProductAccessPointState;

      const artifactEle = {
        _type: 'relationElement',
        columns: ['artifact_col'],
      } as unknown as V1_RelationElement;

      const engineSpy = jest.spyOn(apState, 'fetchSampleDataFromEngine');
      const artifactSpy = jest
        .spyOn(apState, 'fetchSampleDataFromArtifact')
        .mockResolvedValue(artifactEle);

      await apState.fetchSampleData(Promise.resolve(undefined), undefined);

      expect(apState.relationElement).toEqual(artifactEle);
      expect(artifactSpy).toHaveBeenCalled();
      expect(engineSpy).not.toHaveBeenCalled();
    });
  });
});
