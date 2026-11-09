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

import { describe, expect, test } from '@jest/globals';
import { createSpy } from '@finos/legend-shared/test';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult, runInAction } from 'mobx';
import {
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_DataRequest,
  V1_LiteDataContract,
  V1_RequestState,
  V1_User,
  V1_UserType,
} from '@finos/legend-graph';
import {
  TEST__getDataProductDataAccessState,
  TEST__getDataProductViewerState,
} from '../../../components/__test-utils__/StateTestUtils.js';
import {
  mockEntitlementsMultiGroupLargeSDLCDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockMultiGroupLargeSDLCDataProduct,
  mockSDLCDataProduct,
} from '../../../components/__test-utils__/TEST_DATA__LakehouseDataProducts.js';

describe('DataProductDataAccessState', () => {
  test('access point groups share a single data requests fetch', async () => {
    const viewerState =
      await TEST__getDataProductViewerState(mockSDLCDataProduct);
    runInAction(() => {
      viewerState.entitlementsDataProductDetails =
        mockEntitlementsSDLCDataProduct;
    });
    const dataAccessState = TEST__getDataProductDataAccessState(
      viewerState,
      mockEntitlementsSDLCDataProduct,
    );
    const getDataRequestsForDataProductSpy = createSpy(
      dataAccessState.lakehouseContractServerClient,
      'getDataRequestsForDataProduct',
    ).mockResolvedValue({ dataRequests: [] });
    const apgStates = [
      ...viewerState.apgStates,
      guaranteeNonNullable(viewerState.apgStates[0]),
    ];

    await Promise.all(
      apgStates.map((apgState) =>
        apgState.fetchDataRequestAccessFallback(
          dataAccessState.lakehouseContractServerClient,
          () => 'token',
          dataAccessState.dataAccessPlugins,
        ),
      ),
    );

    expect(getDataRequestsForDataProductSpy).toHaveBeenCalledTimes(1);
  });

  test('approved users are fetched once per data product', async () => {
    const viewerState =
      await TEST__getDataProductViewerState(mockSDLCDataProduct);
    const dataAccessState = TEST__getDataProductDataAccessState(
      viewerState,
      mockEntitlementsSDLCDataProduct,
    );
    const client = dataAccessState.lakehouseContractServerClient;
    const systemAccount = new V1_User();
    systemAccount.name = 'system-account';
    systemAccount.userType = V1_UserType.SYSTEM_ACCOUNT;
    const consumer = new V1_AdhocTeam();
    consumer.users = [systemAccount];
    const systemAccountContract = new V1_LiteDataContract();
    systemAccountContract.guid = 'system-account-contract';
    systemAccountContract.consumer = consumer;
    dataAccessState.setAssociatedContracts([systemAccountContract]);
    createSpy(dataAccessState, 'getDataRequests').mockResolvedValue([
      {
        guid: 'completed-request',
        state: V1_RequestState.COMPLETED,
      } as V1_DataRequest,
    ]);
    const getApprovedUsersForDataContractsSpy = createSpy(
      client,
      'getApprovedUsersForDataContracts',
    ).mockResolvedValue({});
    const getApprovedUsersForCompletedDataRequestsSpy = createSpy(
      client,
      'getApprovedUsersForCompletedDataRequests',
    ).mockResolvedValue({});

    await Promise.all([
      dataAccessState.getSystemAccountContractApprovedUsers('token'),
      dataAccessState.getSystemAccountContractApprovedUsers('token'),
      dataAccessState.getCompletedDataRequestApprovedUsers('token'),
      dataAccessState.getCompletedDataRequestApprovedUsers('token'),
    ]);

    expect(getApprovedUsersForDataContractsSpy).toHaveBeenCalledTimes(1);
    expect(getApprovedUsersForDataContractsSpy).toHaveBeenCalledWith(
      ['system-account-contract'],
      'token',
    );
    expect(getApprovedUsersForCompletedDataRequestsSpy).toHaveBeenCalledTimes(
      1,
    );
    expect(getApprovedUsersForCompletedDataRequestsSpy).toHaveBeenCalledWith(
      ['completed-request'],
      'token',
    );
  });

  test('each access point group reads its own approved users from the shared response', async () => {
    const viewerState = await TEST__getDataProductViewerState(
      mockMultiGroupLargeSDLCDataProduct,
    );
    runInAction(() => {
      viewerState.entitlementsDataProductDetails =
        mockEntitlementsMultiGroupLargeSDLCDataProduct;
    });
    const dataAccessState = TEST__getDataProductDataAccessState(
      viewerState,
      mockEntitlementsMultiGroupLargeSDLCDataProduct,
    );
    const client = dataAccessState.lakehouseContractServerClient;
    const buildCompletedRequest = (
      guid: string,
      accessPointGroup: string,
    ): V1_DataRequest => {
      const resource = new V1_AccessPointGroupReference();
      resource.accessPointGroup = accessPointGroup;
      const request = new V1_DataRequest();
      request.guid = guid;
      request.state = V1_RequestState.COMPLETED;
      request.resource = resource;
      return request;
    };
    createSpy(dataAccessState, 'getDataRequests').mockResolvedValue([
      buildCompletedRequest('request-a', 'MULTI_GROUP_A'),
      buildCompletedRequest('request-b', 'MULTI_GROUP_B'),
    ]);
    createSpy(client, 'getApprovedWorkforceUsersForAPG').mockResolvedValue({
      approvedUsers: [],
    });
    const getApprovedUsersForCompletedDataRequestsSpy = createSpy(
      client,
      'getApprovedUsersForCompletedDataRequests',
    ).mockResolvedValue({
      'request-a': [{ name: 'user-a' }],
      'request-b': [{ name: 'user-b' }],
    });
    const groupA = guaranteeNonNullable(
      viewerState.apgStates.find((state) => state.apg.id === 'MULTI_GROUP_A'),
    );
    const groupB = guaranteeNonNullable(
      viewerState.apgStates.find((state) => state.apg.id === 'MULTI_GROUP_B'),
    );

    await Promise.all(
      [groupA, groupB].map((apgState) =>
        flowResult(apgState.fetchApprovedWorkforceUsers(client, 'token')),
      ),
    );

    expect(getApprovedUsersForCompletedDataRequestsSpy).toHaveBeenCalledTimes(
      1,
    );
    expect(groupA.approvedWorkforceUsers).toEqual(['user-a']);
    expect(groupB.approvedWorkforceUsers).toEqual(['user-b']);
  });
});
