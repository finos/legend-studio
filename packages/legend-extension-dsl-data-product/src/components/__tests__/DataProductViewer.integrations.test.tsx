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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type * as LegendApplication from '@finos/legend-application';
import {
  type V1_DataContract,
  type V1_LiteDataContract,
  DataProductAccessType,
  V1_AccessPointGroupReferenceType,
  V1_ContractState,
  V1_OrganizationalScopeType,
  V1_ResourceType,
  V1_UserType,
} from '@finos/legend-graph';
import {
  getMockDataProductGenerationFilesByType,
  mockEntitlementsAdHocDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockSDLCDataProduct,
  mockSDLCDataProductDatabricksAP,
  mockSDLCDataProductParameterizedAP,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
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

const WORK_IN_PROGRESS = 'Work in progress';
const NOT_SUPPORTED = 'Not Supported';

describe('DataProductViewer', () => {
  describe('Governance with registry metadata', () => {
    test('Shows governance tab message when registry metadata id is missing', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
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

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: undefined,
          ads: false,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);
      await screen.findByText(
        'Governance has not been registered for this access point',
      );
    });

    test('Shows governance tab message when registry metadata is not fetched', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
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

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockRejectedValue(new Error('Failed to fetch'));
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);
      await screen.findByText(
        'Governance has not been registered for this access point',
      );
    });

    test('Shows governance tab message for AdHoc Data Products', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsAdHocDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);
      await screen.findByText(
        'Governance not supported for Adhoc Data Products',
      );
    });

    test('Shows Open Governance Details and Open Lineage Viewer buttons when registry metadata is available', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
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

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id-123',
          ads: true,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);

      // Both buttons should be present
      await screen.findByRole('button', { name: 'Open Governance Details' });
      await screen.findByRole('button', { name: 'Open Lineage Viewer' });

      //click governance
      const openGovernanceButton = await screen.findByRole('button', {
        name: 'Open Governance Details',
      });
      fireEvent.click(openGovernanceButton);

      expect(dataProductViewerState.openGovernance).toHaveBeenCalledWith(
        'test-registry-id-123',
      );

      //click lineage
      const openLineageButton = await screen.findByRole('button', {
        name: 'Open Lineage Viewer',
      });
      fireEvent.click(openLineageButton);

      expect(dataProductViewerState.openLineage).toHaveBeenCalledWith(
        'Mock_SDLC_DataProduct',
        'customer_demographics',
      );
    });

    test('Open Governance Details button is disabled when openGovernance function is not configured', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
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

      // Clear the openGovernance function to simulate it not being configured
      (dataProductViewerState as { openGovernance: undefined }).openGovernance =
        undefined;

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id-123',
          ads: true,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);

      const openGovernanceButton = await screen.findByRole('button', {
        name: 'Open Governance Details',
      });
      expect((openGovernanceButton as HTMLButtonElement).disabled).toBe(true);
      expect(
        (openGovernanceButton as HTMLButtonElement).getAttribute('title'),
      ).toBe('Governance not configured');
    });

    test('Open Lineage Viewer button is disabled when openLineage function is not configured', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
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

      // Clear the openLineage function to simulate it not being configured
      (dataProductViewerState as { openLineage: undefined }).openLineage =
        undefined;

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id-123',
          ads: true,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);

      const openLineageButton = await screen.findByRole('button', {
        name: 'Open Lineage Viewer',
      });

      expect((openLineageButton as HTMLButtonElement).disabled).toBe(true);
      expect(
        (openLineageButton as HTMLButtonElement).getAttribute('title'),
      ).toBe('Lineage not configured');
    });
  });

  describe('LegendQueryScreen', () => {
    test('shows "Not Supported" when dataAccessState is undefined', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        [],
        [],
        undefined,
        undefined,
        { openQuery: jest.fn() },
      );

      await screen.findByText('Customer Demographics');

      // Click on the Legend Query tab
      const queryTab = await screen.findByRole('tab', {
        name: 'Legend Query',
      });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      await screen.findByText(NOT_SUPPORTED);
    });

    test('shows "Work in progress" for ad-hoc data product origin', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsAdHocDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: jest.fn() },
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', {
        name: 'Legend Query',
      });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      await screen.findByText(WORK_IN_PROGRESS);
    });

    test('shows "Work in progress" when openQuery action is not provided', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', {
        name: 'Legend Query',
      });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      await screen.findByText(WORK_IN_PROGRESS);
    });

    test('renders "Open in Legend Query" button for SDLC data product with openQuery provided', async () => {
      const mockOpenQuery = jest.fn();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: mockOpenQuery },
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', {
        name: 'Legend Query',
      });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      const openButton = await screen.findByRole('button', {
        name: 'Open in Legend Query',
      });
      expect(openButton).toBeDefined();
    });

    test('clicking "Open in Legend Query" calls openQuery with correct parameters', async () => {
      const mockOpenQuery = jest.fn();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: mockOpenQuery },
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', {
        name: 'Legend Query',
      });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      const openButton = await screen.findByRole('button', {
        name: 'Open in Legend Query',
      });
      await act(async () => {
        fireEvent.click(openButton);
      });

      expect(mockOpenQuery).toHaveBeenCalledWith(
        {
          groupId: 'com.example.analytics',
          artifactId: 'customer-analytics',
          versionId: '1.2.0',
        },
        DataProductAccessType.LAKEHOUSE,
        'customer_demographics',
      );
    });

    test('handles error thrown by openQuery gracefully', async () => {
      const mockOpenQuery = jest.fn().mockImplementation(() => {
        throw new Error('Query open failed');
      });
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: mockOpenQuery },
      );

      const notifyErrorSpy = jest.spyOn(
        dataProductViewerState.applicationStore.notificationService,
        'notifyError',
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', {
        name: 'Legend Query',
      });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      const openButton = await screen.findByRole('button', {
        name: 'Open in Legend Query',
      });
      await act(async () => {
        fireEvent.click(openButton);
      });

      expect(mockOpenQuery).toHaveBeenCalled();
      expect(notifyErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Non-Snowflake compute target guard', () => {
    const projectGAVCoordinates = {
      groupId: 'test.group',
      artifactId: 'test-artifact',
      versionId: '1.0.0',
    };
    const unsupportedMessage =
      'This feature is not supported for access points deployed to Databricks.';

    test('SQL tab shows the unsupported message for a Databricks-targeted access point', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductDatabricksAP,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        projectGAVCoordinates,
      );

      await screen.findByText('Mock SDLC Data Product');
      const sqlTab = await screen.findByRole('tab', { name: 'SQL' });
      fireEvent.click(sqlTab);

      await screen.findByText(unsupportedMessage);
    });

    test('Datacube tab shows the unsupported message for a Databricks-targeted access point', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductDatabricksAP,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        projectGAVCoordinates,
      );

      await screen.findByText('Mock SDLC Data Product');
      const dataCubeTab = await screen.findByRole('tab', { name: 'Datacube' });
      fireEvent.click(dataCubeTab);

      await screen.findByText(unsupportedMessage);
    });

    test('Legend Query tab shows the unsupported message for a Databricks-targeted access point', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductDatabricksAP,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        projectGAVCoordinates,
      );

      await screen.findByText('Mock SDLC Data Product');
      const queryTab = await screen.findByRole('tab', {
        name: 'Legend Query',
      });
      fireEvent.click(queryTab);

      await screen.findByText(unsupportedMessage);
    });

    test('Power BI tab shows the unsupported message for a Databricks-targeted access point', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductDatabricksAP,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        projectGAVCoordinates,
      );

      await screen.findByText('Mock SDLC Data Product');
      const powerBiTab = await screen.findByRole('tab', { name: 'Power BI' });
      fireEvent.click(powerBiTab);

      await screen.findByText(unsupportedMessage);
    });

    test('SQL tab renders normally (no unsupported message) for a Snowflake-targeted access point', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        projectGAVCoordinates,
      );

      await screen.findByText('Mock SDLC Data Product');
      const sqlTab = await screen.findByRole('tab', { name: 'SQL' });
      fireEvent.click(sqlTab);

      await screen.findByRole('button', { name: 'Open SQL Playground' });
      expect(screen.queryByText(unsupportedMessage)).toBeNull();
    });
  });

  describe('Parameterized access point guard', () => {
    const parameterizedDatacubeTitle =
      'Open in Datacube is not available for parameterized access points';
    const parameterizedQueryTitle =
      'Open in Legend Query is not available for parameterized access points';

    test('Datacube tab button is disabled with an explanatory title for a parameterized access point', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const openDataCubeMock = jest.fn();
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProductParameterizedAP,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
          {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
          getMockDataProductGenerationFilesByType(
            mockSDLCDataProductParameterizedAP,
          ),
          { openDataCube: openDataCubeMock },
        );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      act(() => {
        dataProductDataAccessState?.setLakehouseIngestEnvironmentSummaries([
          IngestDeploymentServerConfig.serialization.fromJson({
            ingestServerUrl: 'https://dev-test.example.com',
            ingestEnvironmentUrn: 'urn:dev:test',
            environmentName: 'Development',
            environmentClassification: 'FULL',
          }),
        ]);
      });

      const dataCubeTab = await screen.findByRole('tab', {
        name: 'Datacube',
      });
      fireEvent.click(dataCubeTab);
      const openDataCubeBtn = await screen.findByTitle(
        parameterizedDatacubeTitle,
      );
      expect(openDataCubeBtn).toBeDefined();
      expect(openDataCubeBtn.hasAttribute('disabled')).toBe(true);
      fireEvent.click(openDataCubeBtn);
      expect(openDataCubeMock).not.toHaveBeenCalled();
    });

    test('Legend Query tab button is disabled with an explanatory title for a parameterized access point', async () => {
      const mockOpenQuery = jest.fn();
      await setupLakehouseDataProductTest(
        mockSDLCDataProductParameterizedAP,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: mockOpenQuery },
      );

      await screen.findByText('Mock SDLC Data Product');
      const queryTab = await screen.findByRole('tab', {
        name: 'Legend Query',
      });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      const openQueryBtn = await screen.findByTitle(parameterizedQueryTitle);
      expect(openQueryBtn).toBeDefined();
      expect(openQueryBtn.hasAttribute('disabled')).toBe(true);
      fireEvent.click(openQueryBtn);
      expect(mockOpenQuery).not.toHaveBeenCalled();
    });
  });

  describe('ServiceScreen', () => {
    beforeEach(() => {
      jest.spyOn(MockedMonacoEditorAPI, 'create').mockReturnValue({
        ...MockedMonacoEditorInstance,
        getValue: jest.fn().mockReturnValue(''),
      });
      jest
        .spyOn(MockedMonacoEditorAPI, 'createModel')
        .mockReturnValue(MockedMonacoEditorModel);
    });

    test('shows compute deployment guide banner when user has access', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', { name: 'ENTITLED' });
      await screen.findByText('Customer Demographics');

      const serviceTab = await screen.findByRole('tab', { name: 'Service' });
      await act(async () => {
        fireEvent.click(serviceTab);
      });

      // Should display the compute deployment guide banner (user has access)
      await screen.findByText(
        /For Production compute selection \(Compute ID\), see lakehouse/,
      );

      // Should NOT display the no-access warning
      expect(
        screen.queryByText(/You do not have access to this access point group/),
      ).toBeNull();
    });

    test('shows no-access warning when user has no access', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');

      const serviceTab = await screen.findByRole('tab', { name: 'Service' });
      await act(async () => {
        fireEvent.click(serviceTab);
      });

      // Should display the no-access warning
      await screen.findByText(
        /You do not have access to this access point group/,
      );
    });

    test('copy button copies curl command to clipboard', async () => {
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          [],
          [],
        );

      // Mock the clipboard service
      const mockCopyToClipboard = jest
        .spyOn(
          guaranteeNonNullable(dataProductDataAccessState).applicationStore
            .clipboardService,
          'copyTextToClipboard',
        )
        .mockResolvedValue(undefined);

      await screen.findByText('Customer Demographics');

      const serviceTab = await screen.findByRole('tab', { name: 'Service' });
      await act(async () => {
        fireEvent.click(serviceTab);
      });

      const copyButton = await screen.findByTitle('Copy cURL command');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockCopyToClipboard).toHaveBeenCalledWith(
        expect.stringContaining(
          'curl -X GET "http://test-engine-server-client-url/lakehouse/v1/execute/MOCK_SDLC_DATAPRODUCT/customer_demographics/DEFAULT"',
        ),
      );

      mockCopyToClipboard.mockRestore();
    });

    test('Open in Zipkin button opens new tab with correct URL', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      guaranteeNonNullable(
        dataProductDataAccessState,
      ).engineServerClient.setZipkinUrl('http://test-zipkin-url/');

      const mockVisitAddress = jest
        .spyOn(
          guaranteeNonNullable(dataProductDataAccessState).applicationStore
            .navigationService.navigator,
          'visitAddress',
        )
        .mockImplementation(() => undefined);

      await screen.findByRole('button', { name: 'ENTITLED' });
      await screen.findByText('Customer Demographics');

      const serviceTab = await screen.findByRole('tab', { name: 'Service' });
      await act(async () => {
        fireEvent.click(serviceTab);
      });

      const zipkinButton = await screen.findByTitle(
        'View traces in Zipkin for this access point',
      );
      await act(async () => {
        fireEvent.click(zipkinButton);
      });

      expect(mockVisitAddress).toHaveBeenCalledWith(
        expect.stringContaining(
          'http://test-zipkin-url/?spanName=all&lookback=3600000&annotationQuery=dataProductName%3DMOCK_SDLC_DATAPRODUCT%20and%20accessPoint%3Dcustomer_demographics&minDuration=&limit=100&sortOrder=timestamp-desc',
        ),
      );

      mockVisitAddress.mockRestore();
    });
  });
});
