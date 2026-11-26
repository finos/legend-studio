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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  NetworkClientError,
  HttpStatus,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type * as LegendApplication from '@finos/legend-application';
import {
  type V1_DataContract,
  type V1_LiteDataContract,
  V1_AccessPointGroupReferenceType,
  V1_ContractState,
  V1_deserializeDataSubscriptionTarget,
  V1_EnrichedUserApprovalStatus,
  V1_OrganizationalScopeType,
  V1_RequestState,
  V1_RequestType,
  V1_ResourceType,
  V1_UnknownOrganizationalScopeType,
  V1_UserType,
} from '@finos/legend-graph';
import {
  getMockDataProductGenerationFilesByType,
  mockEnterpriseDataProduct,
  mockEntitlementsEnterpriseDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockSDLCDataProduct,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import { flowResult } from 'mobx';
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
  describe('Access/contract logic', () => {
    test('displays REQUEST ACCESS button when user has no contracts', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [];
      const mockDataContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', { name: 'REQUEST ACCESS' });
    });

    test('displays REQUEST ACCESS button when user has denied contract', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test denied contract',
          guid: 'test-denied-contract-id',
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
          description: 'Test denied contract',
          guid: 'test-denied-contract-id',
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

      await screen.findByRole('button', { name: 'REQUEST ACCESS' });
    });

    test('clicking REQUEST ACCESS button opens create contract modal', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [];
      const mockDataContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const requestAccessButton = await screen.findByRole('button', {
        name: 'REQUEST ACCESS',
      });
      fireEvent.click(requestAccessButton);

      await screen.findByText('Data Contract Request');
    });

    test('REQUEST ACCESS secondary button only shows "Manage Subscriptions"', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [];
      const mockDataContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Manage Subscriptions');
    });

    test('displays PENDING MANAGER APPROVAL button for contract in PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL status', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
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
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
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

      await screen.findByRole('button', { name: 'PENDING MANAGER APPROVAL' });
    });

    test('clicking PENDING MANAGER APPROVAL button opens pending contract viewer', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
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
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
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

      await screen.findByText('Main Group Test');
      const pendingButton = await screen.findByRole('button', {
        name: 'PENDING MANAGER APPROVAL',
      });
      fireEvent.click(pendingButton);

      await screen.findByText('Pending Data Access Request');
    });

    test('PENDING MANAGER APPROVAL secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
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
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
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

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('displays PENDING DATA OWNER APPROVAL button for contract in PENDING_DATA_OWNER_APPROVAL status', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
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
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
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

      await screen.findByRole('button', {
        name: 'PENDING DATA OWNER APPROVAL',
      });
    });

    test('clicking PENDING DATA OWNER APPROVAL button opens pending contract viewer', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
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
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
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

      await screen.findByText('Main Group Test');
      const pendingButton = await screen.findByRole('button', {
        name: 'PENDING DATA OWNER APPROVAL',
      });
      fireEvent.click(pendingButton);

      await screen.findByText('Pending Data Access Request');
    });

    test('PENDING DATA OWNER APPROVAL secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
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
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
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

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('Access point sql tab has a open sql playground button to open editor to run queries.', async () => {
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
          {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
          getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
        );

      jest
        .spyOn(MockedMonacoEditorAPI, 'create')
        .mockReturnValue(MockedMonacoEditorInstance);
      jest
        .spyOn(MockedMonacoEditorAPI, 'createModel')
        .mockReturnValue(MockedMonacoEditorModel);

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

      const sqlTab = await screen.findByRole('tab', { name: 'SQL' });
      fireEvent.click(sqlTab);
      const openSqlPlaygroundBtn = await screen.findByRole('button', {
        name: 'Open SQL Playground',
      });
      expect(openSqlPlaygroundBtn).toBeDefined();
      fireEvent.click(openSqlPlaygroundBtn);
      await screen.findByText('result');
      await screen.findByText('Local Mode');
      const localToggleMode = await screen.findByRole('button', {
        name: 'local mode',
      });
      expect(localToggleMode).toBeDefined();
      fireEvent.click(localToggleMode);
      expect(localToggleMode.className).toContain(
        'query-builder__result__advanced__mode__toggler__btn--toggled',
      );
      const runQueryBtn = await screen.findByRole('button', {
        name: 'Run Query',
      });
      expect(runQueryBtn).toBeDefined();
      fireEvent.click(runQueryBtn);
    });

    test('Access point sql tab has a copy connnection string button.', async () => {
      const { dataProductDataAccessState } =
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
      const clipboardService =
        dataProductDataAccessState?.applicationStore.clipboardService;
      expect(clipboardService).toBeDefined();
      const clipBoardSpy = jest
        .spyOn(
          clipboardService as NonNullable<typeof clipboardService>,
          'copyTextToClipboard',
        )
        .mockResolvedValue(undefined);
      const notificationService =
        dataProductDataAccessState?.applicationStore.notificationService;
      expect(notificationService).toBeDefined();
      const notifySpy = jest.spyOn(
        notificationService as NonNullable<typeof notificationService>,
        'notifySuccess',
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

      const sqlTab = await screen.findByRole('tab', { name: 'SQL' });
      fireEvent.click(sqlTab);
      const openCopyConnectionString = await screen.findByTitle(
        'Copy Connection String',
      );
      expect(openCopyConnectionString).toBeDefined();
      expect(openCopyConnectionString.hasAttribute('disabled')).toBe(false);
      fireEvent.click(openCopyConnectionString);
      await waitFor(() => {
        expect(clipBoardSpy).toHaveBeenCalledTimes(1);
        expect(notifySpy).toHaveBeenCalledWith(
          'Copied connection string to clipboard',
        );
        expect(clipBoardSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `projects|com.example.analytics:customer-analytics:1.2.0?options='--compute=snowflake --environment=Development --warehouse=LAKEHOUSE_CONSUMER_DEFAULT_WH'`,
          ),
        );
      });
      const infoIcon = await screen.findByTitle('See Documentation');
      expect(infoIcon).toBeDefined();
      fireEvent.click(infoIcon);
    });

    test('Access point SQL, Power BI, and Datacube buttons are disabled when user has no access', async () => {
      const { dataProductDataAccessState } =
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
          { openPowerBi: jest.fn(), openDataCube: jest.fn() },
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

      // Check SQL tab button is disabled
      const sqlTab = await screen.findByRole('tab', { name: 'SQL' });
      fireEvent.click(sqlTab);
      await waitFor(() => {
        const openSqlPlaygroundBtn = screen.getByTitle(
          'You do not have access to this access point group. Please request access first.',
        );
        expect(openSqlPlaygroundBtn.hasAttribute('disabled')).toBe(true);
      });

      // Check Power BI tab button is disabled
      const powerBiTab = await screen.findByRole('tab', {
        name: 'Power BI',
      });
      fireEvent.click(powerBiTab);
      await waitFor(() => {
        const openPowerBiBtn = screen.getByTitle(
          'You do not have access to this access point group. Please request access first.',
        );
        expect(openPowerBiBtn.hasAttribute('disabled')).toBe(true);
      });

      // Check Datacube tab button is disabled
      const dataCubeTab = await screen.findByRole('tab', {
        name: 'Datacube',
      });
      fireEvent.click(dataCubeTab);
      await waitFor(() => {
        const openDataCubeBtn = screen.getByTitle(
          'You do not have access to this access point group. Please request access first.',
        );
        expect(openDataCubeBtn.hasAttribute('disabled')).toBe(true);
      });
    });

    test('Access point Power BI tab button is enabled when user has access', async () => {
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

      const openPowerBiMock = jest.fn();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
        getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
        { openPowerBi: openPowerBiMock },
      );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      const powerBiTab = await screen.findByRole('tab', {
        name: 'Power BI',
      });
      fireEvent.click(powerBiTab);
      const openPowerBiBtn = await screen.findByRole('button', {
        name: 'Open in Power BI',
      });
      expect(openPowerBiBtn).toBeDefined();
      expect(openPowerBiBtn.hasAttribute('disabled')).toBe(false);
      fireEvent.click(openPowerBiBtn);
      expect(openPowerBiMock).toHaveBeenCalledWith('GROUP1');
    });

    test('Access point Power BI tab button is disabled when user has no access', async () => {
      const openPowerBiMock = jest.fn();
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
        { openPowerBi: openPowerBiMock },
      );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      const powerBiTab = await screen.findByRole('tab', {
        name: 'Power BI',
      });
      fireEvent.click(powerBiTab);
      const openPowerBiBtn = await screen.findByTitle(
        'You do not have access to this access point group. Please request access first.',
      );
      expect(openPowerBiBtn).toBeDefined();
      expect(openPowerBiBtn.hasAttribute('disabled')).toBe(true);
      fireEvent.click(openPowerBiBtn);
      expect(openPowerBiMock).not.toHaveBeenCalled();
    });

    test('Access point Datacube tab button is enabled when user has access', async () => {
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
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
          {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
          getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
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
      const openDataCubeBtn = await screen.findByRole('button', {
        name: 'Open in Datacube',
      });
      expect(openDataCubeBtn).toBeDefined();
      expect(openDataCubeBtn.hasAttribute('disabled')).toBe(false);
    });

    test('Access point Datacube tab button is disabled when user has no access', async () => {
      const openDataCubeMock = jest.fn();
      const { dataProductDataAccessState } =
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
        'You do not have access to this access point group. Please request access first.',
      );
      expect(openDataCubeBtn).toBeDefined();
      expect(openDataCubeBtn.hasAttribute('disabled')).toBe(true);
    });

    test('displays ENTITLED button for contract in APPROVED status', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
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
          description: 'Test pending data owner approval contract',
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
    });

    test('displays ENTITLED button for contract when user is approved but entire contract is not yet completed', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test partially approved contract',
          guid: 'test-partially-approved-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
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
          description: 'Test partially approved contract',
          guid: 'test-partially-approved-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
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
    });

    test('clicking ENTITLED button opens completed contract viewer', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
            _type: V1_OrganizationalScopeType.AdHocTeam,
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
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
            _type: V1_OrganizationalScopeType.AdHocTeam,
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

      await screen.findByText('Main Group Test');
      const entitledButton = await screen.findByRole('button', {
        name: 'ENTITLED',
      });
      fireEvent.click(entitledButton);

      await screen.findByText('Data Access Request');
    });

    test('ENTITLED secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
            _type: V1_OrganizationalScopeType.AdHocTeam,
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
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
            _type: V1_OrganizationalScopeType.AdHocTeam,
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

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('displays ENTITLEMENTS SYNCING button when user is approved but not yet in consumer grants', async () => {
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

      const { dataProductDataAccessState, dataProductViewerState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      // Override the default consumer grants mock to return empty users
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      ).mockResolvedValue({
        contractId: 'test-approved-contract-id',
        accessPointGroups: [],
        users: [],
      });

      // Re-fetch to trigger the new mock
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await screen.findByRole('button', { name: /ENTITLEMENTS SYNCING/ });

      // Cleanup: stop polling to prevent timer leaks
      dataProductViewerState.apgStates.forEach((s) =>
        s.stopPollingConsumerGrant(),
      );
    });

    test('displays ENTITLEMENTS SYNCING button when consumer grants response has no users array', async () => {
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

      const { dataProductDataAccessState, dataProductViewerState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      // Override to return response with no users array
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      ).mockResolvedValue({
        contractId: 'test-approved-contract-id',
        accessPointGroups: [],
      });

      // Re-fetch to trigger the new mock
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await screen.findByRole('button', { name: /ENTITLEMENTS SYNCING/ });

      // Cleanup: stop polling to prevent timer leaks
      dataProductViewerState.apgStates.forEach((s) =>
        s.stopPollingConsumerGrant(),
      );
    });

    test('transitions from ENTITLEMENTS SYNCING to ENTITLED when polling returns user in consumer grants', async () => {
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

      const { dataProductDataAccessState, dataProductViewerState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      // First call return empty users (syncing). Second call returns the user.
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      )
        .mockResolvedValueOnce({
          contractId: 'test-approved-contract-id',
          accessPointGroups: [],
          users: [],
        })
        .mockResolvedValueOnce({
          contractId: 'test-approved-contract-id',
          accessPointGroups: [],
          users: [
            {
              username: 'test-consumer-user-id',
              contractId: 'test-approved-contract-id',
              targetAccount: 'test-account',
            },
          ],
        });

      // Re-fetch to trigger the new mock (with real timers)
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show ENTITLEMENTS SYNCING initially
      await screen.findByRole('button', { name: /ENTITLEMENTS SYNCING/ });

      // Stop the existing polling timer (which uses a 5s real setTimeout)
      dataProductViewerState.apgStates.forEach((s) =>
        s.stopPollingConsumerGrant(),
      );

      // Directly trigger a poll on each APG state to simulate the next poll cycle.
      // The second mock response (with user) will be consumed.
      await act(async () => {
        await Promise.all(
          dataProductViewerState.apgStates.map((s) =>
            s.pollConsumerGrant(
              'test-approved-contract-id',
              guaranteeNonNullable(dataProductDataAccessState)
                .lakehouseContractServerClient,
              () => undefined,
            ),
          ),
        );
      });

      // After polling returns the user, should show ENTITLED
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ENTITLED' })).toBeDefined();
      });

      // Cleanup: stop polling to prevent timer leaks
      dataProductViewerState.apgStates.forEach((s) =>
        s.stopPollingConsumerGrant(),
      );
    });

    test('displays ENTITLED with case-insensitive user matching', async () => {
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

      // Override to return user with different casing - should match case-insensitively
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      ).mockResolvedValue({
        contractId: 'test-approved-contract-id',
        accessPointGroups: [],
        users: [
          {
            username: 'TEST-CONSUMER-USER-ID',
            contractId: 'test-approved-contract-id',
            targetAccount: 'test-account',
          },
        ],
      });

      // Re-fetch to trigger the new mock
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show ENTITLED because case-insensitive match finds the user
      await screen.findByRole('button', { name: 'ENTITLED' });
    });

    test('displays ENTITLED button when getConsumerGrantsByContractId returns 404', async () => {
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

      // Override to return a 404 error for consumer grants
      const notFoundError = new NetworkClientError(
        { status: HttpStatus.NOT_FOUND, statusText: 'Not Found' } as Response,
        undefined,
      );
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      ).mockRejectedValue(notFoundError);

      // Re-fetch to trigger the new mock
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show ENTITLED (not ENTITLEMENTS SYNCING) because 404 means grants endpoint is not available
      await screen.findByRole('button', { name: 'ENTITLED' });
    });

    test('displays ENTERPRISE ACCESS for Access Point Group marked as Enterprise', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
        [],
      );

      await screen.findByRole('button', { name: 'ENTERPRISE ACCESS' });
    });

    test('ENTERPRISE ACCESS secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
        [],
      );

      await screen.findByText('ENTERPRISE_GROUP');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('Request Access for Others button opens create contract modal', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
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
          description: 'Test pending data owner approval contract',
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

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      const requestForOthersButton = await screen.findByText(
        'Request Access for Others',
      );
      fireEvent.click(requestForOthersButton);

      await screen.findByText('Data Contract Request');
      screen.getByRole('button', { name: 'User' });
      screen.getByRole('button', { name: 'System Account' });
    });

    test('On enterprise APG, Request Access for Others button opens create contract modal with system account and user', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
        [],
      );

      await screen.findByText('ENTERPRISE_GROUP');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      const requestForOthersButton = await screen.findByText(
        'Request Access for Others',
      );
      fireEvent.click(requestForOthersButton);

      await screen.findByText('Data Contract Request');
      await screen.findByRole('button', { name: 'System Account' });
      await screen.findByRole('button', { name: 'User' });
    });

    test('displays disabled UNKNOWN button when no DataProductDataAccessState is provided', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [];
      const mockDataContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        mockLiteContracts,
        mockDataContracts,
      );

      const button = await screen.findByRole('button', { name: 'UNKNOWN' });
      expect(button.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Subscriptions', () => {
    beforeEach(() => {
      jest
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((callback: FrameRequestCallback) => {
          callback(performance.now());
          return 0;
        });
      jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('Manage Subscriptions button opens subscriptions modal', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
        [],
      );

      await screen.findByText('ENTERPRISE_GROUP');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      const manageSubscriptionsButton = await screen.findByText(
        'Manage Subscriptions',
      );
      fireEvent.click(manageSubscriptionsButton);

      await screen.findByText('Data Product Subscriptions');
    });

    test('fetches subscriptions only when the modal is first opened', async () => {
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

      const getSubscriptionsForContractSpy = createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getSubscriptionsForContract',
      ).mockResolvedValue([]);

      expect(getSubscriptionsForContractSpy).not.toHaveBeenCalled();

      await screen.findByText('Main Group Test');
      fireEvent.click(await screen.findByTitle('More options'));
      fireEvent.click(await screen.findByText('Manage Subscriptions'));

      await screen.findByText('Data Product Subscriptions');
      await waitFor(() => {
        expect(getSubscriptionsForContractSpy).toHaveBeenCalledTimes(1);
      });
    });

    test("Create New Subscription contract field lists every approved contract for the group, not just the current user's, and supports search", async () => {
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
        {
          description: 'Other team contract',
          guid: 'test-other-user-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'other-team-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'other-team-user-id',
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

      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getSubscriptionsForContract',
      ).mockResolvedValue([]);

      await screen.findByText('Main Group Test');
      fireEvent.click(await screen.findByTitle('More options'));
      fireEvent.click(await screen.findByText('Manage Subscriptions'));
      await screen.findByText('Data Product Subscriptions');

      const createButton = await screen.findByRole('button', {
        name: 'Create New Subscription',
      });
      fireEvent.click(createButton);

      const contractSelectTrigger = await waitFor(() =>
        guaranteeNonNullable(document.getElementById('contract-select')),
      );
      fireEvent.mouseDown(contractSelectTrigger);

      const listbox = await screen.findByRole('listbox');

      // Both the current user's contract and another user's contract for the
      // same access point group should be listed -- not just the current
      // user's, and not requiring a second, separate API call. Scoped to the
      // listbox since the closed field's own (persistent) value display also
      // contains the currently-selected contract's text.
      await within(listbox).findByText(/Test approved contract/);
      within(listbox).getByText(/Other team contract/);

      const searchInput = screen.getByPlaceholderText(
        'Search by user, description, or creator',
      );

      // Narrowing the search should filter out non-matching contracts.
      fireEvent.change(searchInput, { target: { value: 'other-team' } });
      await waitFor(() => {
        expect(
          within(listbox).queryByText(/Test approved contract/),
        ).toBeNull();
      });
      within(listbox).getByText(/Other team contract/);

      // Regression: typing progressively longer search terms must not cause
      // the field to lose focus (MUI's Select/MenuList re-asserting focus
      // onto the -- now narrower -- option list after each keystroke).
      fireEvent.change(searchInput, { target: { value: 'o' } });
      expect(document.activeElement).toBe(searchInput);
      fireEvent.change(searchInput, { target: { value: 'ot' } });
      expect(document.activeElement).toBe(searchInput);
      fireEvent.change(searchInput, { target: { value: 'oth' } });
      expect(document.activeElement).toBe(searchInput);
    });

    describe('data request subscriptions', () => {
      const TEST_SNOWFLAKE_TARGET = {
        _type: 'Snowflake',
        snowflakeAccountId: 'TEST_SNOWFLAKE_ACCOUNT',
        snowflakeRegion: 'TEST_REGION',
        snowflakeNetwork: 'TEST_NETWORK',
      };

      const buildRawDataRequest = (
        guid: string,
        state: V1_RequestState,
        accessPointGroup: string,
        businessJustification: string,
        consumer: object = {
          _type: V1_OrganizationalScopeType.AdHocTeam,
          users: [
            { name: 'test-requester-id', type: V1_UserType.WORKFORCE_USER },
          ],
        },
      ) => ({
        _type: V1_RequestType.DataRequest,
        businessJustification,
        guid,
        version: 0,
        state,
        resource: {
          _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
          accessPointGroup,
          dataProduct: {
            name: 'MOCK_SDLC_DATAPRODUCT',
            owner: { appDirId: 12345 },
          },
        },
        resourceEnvType: 'prod',
        members: [],
        consumer,
        createdBy: 'test-consumer-user-id',
        userDigest: '',
      });

      const RAW_DATA_REQUESTS = {
        dataRequests: [
          buildRawDataRequest(
            'approved-data-request-id',
            V1_RequestState.COMPLETED,
            'GROUP1',
            'Approved data request',
          ),
          buildRawDataRequest(
            'pending-data-request-id',
            V1_RequestState.SUBMITTED_FOR_APPROVALS,
            'GROUP1',
            'Pending data request',
          ),
          buildRawDataRequest(
            'other-group-data-request-id',
            V1_RequestState.COMPLETED,
            'OTHER_GROUP',
            'Other group data request',
          ),
        ],
      };

      const RAW_DATA_REQUEST_SUBSCRIPTION = {
        subscriptions: [
          {
            guid: 'data-request-subscription-id',
            dataContractId: 'approved-data-request-id',
            target: TEST_SNOWFLAKE_TARGET,
            createdBy: 'test-consumer-user-id',
          },
        ],
      };

      const setupDataRequestSubscriptionTest = async () => {
        const { dataProductDataAccessState } =
          await setupLakehouseDataProductTest(
            mockSDLCDataProduct,
            mockEntitlementsSDLCDataProduct,
            [],
            [],
          );
        const client = guaranteeNonNullable(
          dataProductDataAccessState,
        ).lakehouseContractServerClient;
        createSpy(client, 'getSubscriptionsForContract').mockResolvedValue([]);
        createSpy(client, 'getDataRequestsForDataProduct').mockResolvedValue(
          RAW_DATA_REQUESTS,
        );
        const getSubscriptionsForDataRequestSpy = createSpy(
          client,
          'getSubscriptionsForDataRequest',
        ).mockResolvedValue(RAW_DATA_REQUEST_SUBSCRIPTION);
        createSpy(client, 'getSubscriptionTargets').mockResolvedValue({
          targets: [],
        });
        const createDataRequestSubscriptionSpy = createSpy(
          client,
          'createDataRequestSubscription',
        ).mockResolvedValue(RAW_DATA_REQUEST_SUBSCRIPTION);
        return {
          dataProductDataAccessState: guaranteeNonNullable(
            dataProductDataAccessState,
          ),
          getSubscriptionsForDataRequestSpy,
          createDataRequestSubscriptionSpy,
        };
      };

      const openSubscriptionsModal = async () => {
        await screen.findByText('Main Group Test');
        fireEvent.click(await screen.findByTitle('More options'));
        fireEvent.click(await screen.findByText('Manage Subscriptions'));
        await screen.findByText('Data Product Subscriptions');
      };

      test('marks the creating-subscription state as failed when creation fails and as succeeded otherwise', async () => {
        const { dataProductDataAccessState, createDataRequestSubscriptionSpy } =
          await setupDataRequestSubscriptionTest();
        const apgState = guaranteeNonNullable(
          dataProductDataAccessState.dataProductViewerState.apgStates[0],
        );
        const client = dataProductDataAccessState.lakehouseContractServerClient;
        const target = V1_deserializeDataSubscriptionTarget(
          TEST_SNOWFLAKE_TARGET,
        );

        createDataRequestSubscriptionSpy.mockRejectedValueOnce(
          new Error('creation failed'),
        );
        await flowResult(
          apgState.createDataRequestSubscription(
            'approved-data-request-id',
            target,
            client,
            undefined,
          ),
        );
        expect(apgState.creatingSubscriptionState.hasFailed).toBe(true);

        await flowResult(
          apgState.createDataRequestSubscription(
            'approved-data-request-id',
            target,
            client,
            undefined,
          ),
        );
        expect(apgState.creatingSubscriptionState.hasSucceeded).toBe(true);
      });

      test('createSubscription still sends the contract id and target for contracts', async () => {
        const { dataProductDataAccessState } =
          await setupDataRequestSubscriptionTest();
        const apgState = guaranteeNonNullable(
          dataProductDataAccessState.dataProductViewerState.apgStates[0],
        );
        const client = dataProductDataAccessState.lakehouseContractServerClient;
        const createSubscriptionSpy = createSpy(
          client,
          'createSubscription',
        ).mockResolvedValue(RAW_DATA_REQUEST_SUBSCRIPTION);
        const target = V1_deserializeDataSubscriptionTarget(
          TEST_SNOWFLAKE_TARGET,
        );

        await flowResult(
          apgState.createSubscription(
            'test-approved-contract-id',
            target,
            client,
            undefined,
          ),
        );
        expect(createSubscriptionSpy.mock.calls[0]?.[0]).toEqual({
          contractId: 'test-approved-contract-id',
          target: TEST_SNOWFLAKE_TARGET,
        });
      });

      test('fetches subscriptions of approved data requests for the group only', async () => {
        const {
          dataProductDataAccessState,
          getSubscriptionsForDataRequestSpy,
        } = await setupDataRequestSubscriptionTest();

        await openSubscriptionsModal();

        await waitFor(() => {
          expect(getSubscriptionsForDataRequestSpy).toHaveBeenCalledTimes(1);
        });
        expect(getSubscriptionsForDataRequestSpy.mock.calls[0]?.[0]).toBe(
          'approved-data-request-id',
        );
        const apgState = guaranteeNonNullable(
          dataProductDataAccessState.dataProductViewerState.apgStates[0],
        );
        await waitFor(() => {
          expect(apgState.subscriptions.map((sub) => sub.guid)).toEqual([
            'data-request-subscription-id',
          ]);
        });
        expect(apgState.approvedDataRequests.map((req) => req.guid)).toEqual([
          'approved-data-request-id',
        ]);
      });

      test('Create New Subscription shows the plugin-provided org code for a non-adhoc data request consumer', async () => {
        const { dataProductDataAccessState } =
          await setupDataRequestSubscriptionTest();
        createSpy(
          dataProductDataAccessState.lakehouseContractServerClient,
          'getDataRequestsForDataProduct',
        ).mockResolvedValue({
          dataRequests: [
            buildRawDataRequest(
              'approved-data-request-id',
              V1_RequestState.COMPLETED,
              'GROUP1',
              'Approved data request',
              { _type: 'CUSTOM_ORG', orgNode: 'TEST_ORG_NODE' },
            ),
          ],
        });
        // stand-in for an application plugin that understands this custom scope
        const plugin = guaranteeNonNullable(
          dataProductDataAccessState.dataAccessPlugins[0],
        );
        plugin.getOrganizationalNodeCode = (consumer) =>
          consumer instanceof V1_UnknownOrganizationalScopeType &&
          typeof consumer.content.orgNode === 'string'
            ? consumer.content.orgNode
            : undefined;

        await openSubscriptionsModal();
        const createButton = await screen.findByRole('button', {
          name: 'Create New Subscription',
        });
        await waitFor(() => {
          expect((createButton as HTMLButtonElement).disabled).toBe(false);
        });
        fireEvent.click(createButton);
        fireEvent.mouseDown(
          await waitFor(() =>
            guaranteeNonNullable(document.getElementById('contract-select')),
          ),
        );
        const listbox = await screen.findByRole('listbox');
        within(listbox).getByText(/TEST_ORG_NODE/);
        expect(within(listbox).queryByText(/^CUSTOM_ORG$/)).toBeNull();
      });

      const openCreateSubscriptionContractDropdown = async () => {
        await openSubscriptionsModal();

        const createButton = await screen.findByRole('button', {
          name: 'Create New Subscription',
        });
        await waitFor(() => {
          expect((createButton as HTMLButtonElement).disabled).toBe(false);
        });
        fireEvent.click(createButton);

        fireEvent.mouseDown(
          await waitFor(() =>
            guaranteeNonNullable(document.getElementById('contract-select')),
          ),
        );
        return screen.findByRole('listbox');
      };

      test('Create New Subscription lists only approved data requests for the group', async () => {
        await setupDataRequestSubscriptionTest();

        const listbox = await openCreateSubscriptionContractDropdown();

        await within(listbox).findByText(/Approved data request/);
        expect(within(listbox).queryByText(/Pending data request/)).toBeNull();
        expect(
          within(listbox).queryByText(/Other group data request/),
        ).toBeNull();
      });

      test('Create New Subscription creates the subscription against the data request endpoint and refetches the list', async () => {
        const {
          createDataRequestSubscriptionSpy,
          getSubscriptionsForDataRequestSpy,
        } = await setupDataRequestSubscriptionTest();

        const listbox = await openCreateSubscriptionContractDropdown();
        fireEvent.click(
          await within(listbox).findByText(/Approved data request/),
        );

        const accountInput = screen.getByLabelText(/Snowflake Account ID/);
        fireEvent.change(accountInput, {
          target: { value: TEST_SNOWFLAKE_TARGET.snowflakeAccountId },
        });
        // freeSolo Autocomplete only commits the typed value on Enter/blur
        fireEvent.keyDown(accountInput, { key: 'Enter' });
        fireEvent.click(
          await screen.findByRole('button', { name: 'Create Subscription' }),
        );

        await waitFor(() => {
          expect(createDataRequestSubscriptionSpy).toHaveBeenCalledTimes(1);
        });
        // the subscription list is refetched after a successful creation
        await waitFor(() => {
          expect(getSubscriptionsForDataRequestSpy).toHaveBeenCalledTimes(2);
        });
      });
    });
  });

  describe('Contract fetch optimization', () => {
    test('fetches the full contract only for the user contract returned by getContractsForUser', async () => {
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
        {
          description: 'Test system account contract',
          guid: 'test-system-account-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-system-account',
                type: V1_UserType.SYSTEM_ACCOUNT,
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
        {
          description: 'Test system account contract',
          guid: 'test-system-account-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-system-account',
                type: V1_UserType.SYSTEM_ACCOUNT,
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

      const getDataContractSpy = createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getDataContract',
      ).mockImplementation(async (id: string) => {
        const matchingContract = mockDataContracts.find(
          (_contract) => _contract.guid === id,
        );
        return {
          dataContracts: matchingContract
            ? [{ dataContract: matchingContract }]
            : [],
        };
      });

      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getDataContractSpy).toHaveBeenCalledWith(
        'test-approved-contract-id',
        true,
        undefined,
      );
      expect(getDataContractSpy).not.toHaveBeenCalledWith(
        'test-system-account-contract-id',
        true,
        undefined,
      );
    });

    test('does not pick up user contract from a different data product with the same access point group', async () => {
      // Lite contract returned by `getDataContractsForDataProduct` (already
      // scoped to the current data product) - none for the current user.
      const mockLiteContracts: V1_LiteDataContract[] = [];

      // The user has a contract for a *different* data product but with the
      // same access point group name. This contract is what
      // `getContractsForUser` will return.
      const otherDataProductUserContract: V1_LiteDataContract = {
        description: 'User contract for a different data product',
        guid: 'other-data-product-user-contract-id',
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
        resourceId: 'OTHER_DATAPRODUCT',
        resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
        deploymentId: 99999,
        accessPointGroup: 'GROUP1',
      };

      const mockDataContracts: V1_DataContract[] = [];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      const lakehouseContractServerClient = guaranteeNonNullable(
        dataProductDataAccessState,
      ).lakehouseContractServerClient;

      // Override `getContractsForUser` to return the contract belonging to a
      // different data product but with a matching access point group name.
      createSpy(
        lakehouseContractServerClient,
        'getContractsForUser',
      ).mockResolvedValue([
        {
          contractResultLite: otherDataProductUserContract,
          status: V1_EnrichedUserApprovalStatus.APPROVED,
          user: 'test-consumer-user-id',
        },
      ]);

      const getDataContractSpy = createSpy(
        lakehouseContractServerClient,
        'getDataContract',
      ).mockResolvedValue({ dataContracts: [] });

      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // The user's contract belongs to a different data product, so we should
      // NOT fetch the full contract for it.
      expect(getDataContractSpy).not.toHaveBeenCalledWith(
        'other-data-product-user-contract-id',
        true,
        undefined,
      );

      // No associated user contract should have been resolved for any APG of
      // the current data product.
      const apgStates = guaranteeNonNullable(dataProductDataAccessState)
        .dataProductViewerState.apgStates;
      apgStates.forEach((apgState) => {
        expect(apgState.associatedUserContract).toBeUndefined();
      });
    });
  });
});
