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
import {
  V1_ContractState,
  V1_EnrichedUserApprovalStatus,
  V1_LiteDataContract,
  V1_LiteDataContractWithUserStatus,
  V1_DataRequest,
  V1_DataRequestWithWorkflow,
  V1_RequestState,
} from '@finos/legend-graph';
import { ContractCreatedByUserDetails } from '../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import {
  getSyncCheckId,
  isApprovedRow,
  ROW_KIND_CONTRACT,
  ROW_KIND_REQUEST,
  type EntitlementsRow,
} from '../EntitlementsUtils.js';

const createLiteContract = (
  guid: string,
  state: V1_ContractState,
): V1_LiteDataContract => {
  const contract = new V1_LiteDataContract();
  contract.guid = guid;
  contract.state = state;
  return contract;
};

const ownContractRow = (
  guid: string,
  status: V1_EnrichedUserApprovalStatus,
): EntitlementsRow => {
  const data = new V1_LiteDataContractWithUserStatus();
  data.contractResultLite = createLiteContract(
    guid,
    V1_ContractState.COMPLETED,
  );
  data.status = status;
  return { kind: ROW_KIND_CONTRACT, data };
};

const contractForOthersRow = (
  guid: string,
  state: V1_ContractState,
  memberStatuses: V1_EnrichedUserApprovalStatus[],
): EntitlementsRow => {
  const data = new ContractCreatedByUserDetails(
    createLiteContract(guid, state),
  );
  memberStatuses.forEach((status, index) =>
    data.addMember(`user-${index}`, status),
  );
  return { kind: ROW_KIND_CONTRACT, data };
};

const dataRequestRow = (
  guid: string,
  state: V1_RequestState,
): EntitlementsRow => {
  const dataRequest = new V1_DataRequest();
  dataRequest.guid = guid;
  dataRequest.state = state;
  const data = new V1_DataRequestWithWorkflow();
  data.dataRequest = dataRequest;
  data.workflows = [];
  return { kind: ROW_KIND_REQUEST, data };
};

describe('isApprovedRow / getSyncCheckId', () => {
  test('the user own contracts are approved only when the user is APPROVED', () => {
    expect(
      getSyncCheckId(
        ownContractRow('c1', V1_EnrichedUserApprovalStatus.APPROVED),
      ),
    ).toBe('c1');
    [
      V1_EnrichedUserApprovalStatus.DENIED,
      V1_EnrichedUserApprovalStatus.REVOKED,
      V1_EnrichedUserApprovalStatus.CLOSED,
      V1_EnrichedUserApprovalStatus.NO_ACCESS,
      V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL,
    ].forEach((status) =>
      expect(getSyncCheckId(ownContractRow('c1', status))).toBeUndefined(),
    );
  });

  test('a COMPLETED contract for others is approved when a member is APPROVED', () => {
    const row = contractForOthersRow('c2', V1_ContractState.COMPLETED, [
      V1_EnrichedUserApprovalStatus.DENIED,
      V1_EnrichedUserApprovalStatus.APPROVED,
    ]);
    expect(isApprovedRow(row)).toBe(true);
    expect(getSyncCheckId(row)).toBe('c2');
  });

  test('a COMPLETED contract for others where every member was denied is not approved', () => {
    const row = contractForOthersRow('c3', V1_ContractState.COMPLETED, [
      V1_EnrichedUserApprovalStatus.DENIED,
      V1_EnrichedUserApprovalStatus.DENIED,
    ]);
    expect(isApprovedRow(row)).toBe(false);
    expect(getSyncCheckId(row)).toBeUndefined();
  });

  test('a COMPLETED contract for others with unknown members is checked', () => {
    expect(
      isApprovedRow(contractForOthersRow('c4', V1_ContractState.COMPLETED, [])),
    ).toBe(true);
  });

  test.each([
    V1_ContractState.CLOSED,
    V1_ContractState.REJECTED,
    V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
    V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
    V1_ContractState.DRAFT,
  ])('a %s contract for others is never checked', (state) => {
    expect(
      isApprovedRow(
        contractForOthersRow('c5', state, [
          V1_EnrichedUserApprovalStatus.APPROVED,
        ]),
      ),
    ).toBe(false);
  });

  test('only COMPLETED data requests are approved', () => {
    expect(
      getSyncCheckId(dataRequestRow('dr1', V1_RequestState.COMPLETED)),
    ).toBe('dr1');
    [
      V1_RequestState.DRAFT,
      V1_RequestState.SUBMITTED_FOR_APPROVALS,
      V1_RequestState.REJECTED,
      V1_RequestState.INVALIDATED,
      V1_RequestState.OBSOLETE,
      V1_RequestState.PENDING_INVALIDATION,
    ].forEach((state) =>
      expect(getSyncCheckId(dataRequestRow('dr1', state))).toBeUndefined(),
    );
  });
});
