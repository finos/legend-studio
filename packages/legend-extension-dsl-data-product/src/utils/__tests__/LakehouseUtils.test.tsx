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

import { describe, expect, test } from '@jest/globals';
import {
  V1_AccessPointGroup,
  V1_AccessPointGroupReference,
  V1_DataContract,
  V1_AdhocTeam,
  V1_User,
  V1_UserType,
  V1_UnknownOrganizationalScopeType,
  V1_ApprovalType,
  V1_UserApprovalStatus,
} from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared/test';
import {
  dataContractContainsAccessGroup,
  isMemberOfContract,
  contractContainsSystemAccount,
} from '../DataContractUtils.js';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';

describe('LakehouseUtils', () => {
  test('dataContractContainsAccessGroup should return true if the contract contains the access group', () => {
    const group = new V1_AccessPointGroup();
    group.id = 'group1';

    const contractResource = new V1_AccessPointGroupReference();
    contractResource.accessPointGroup = 'group1';

    const dataContract = new V1_DataContract();
    dataContract.resource = contractResource;

    expect(dataContractContainsAccessGroup(group, dataContract)).toBe(true);
  });

  test('dataContractContainsAccessGroup should return false if the contract does not contain the access group', () => {
    const group = new V1_AccessPointGroup();
    group.id = 'group2';

    const contractResource = new V1_AccessPointGroupReference();
    contractResource.accessPointGroup = 'group1';

    const dataContract = new V1_DataContract();
    dataContract.resource = contractResource;

    expect(dataContractContainsAccessGroup(group, dataContract)).toBe(false);
  });

  test('isMemberOfContract should return true if the user is a member of an ad-hoc team contract', async () => {
    const lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: 'http://test-lakehouse-contract-server-client',
    });

    const user = 'user1';

    const adhocTeam = new V1_AdhocTeam();
    const user1 = new V1_User();
    user1.name = 'user1';
    user1.userType = V1_UserType.WORKFORCE_USER;
    const user2 = new V1_User();
    user2.name = 'user2';
    user2.userType = V1_UserType.WORKFORCE_USER;

    adhocTeam.users = [user1, user2];

    const dataContract = new V1_DataContract();
    dataContract.consumer = adhocTeam;

    expect(
      await isMemberOfContract(
        user,
        dataContract,
        lakehouseContractServerClient,
        undefined,
      ),
    ).toBe(true);
  });

  test('isMemberOfContract should return false if the user is not a member of an ad-hoc team contract', async () => {
    const lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: 'http://test-lakehouse-contract-server-client',
    });

    const user = 'user3';

    const adhocTeam = new V1_AdhocTeam();
    const user1 = new V1_User();
    user1.name = 'user1';
    user1.userType = V1_UserType.WORKFORCE_USER;
    const user2 = new V1_User();
    user2.name = 'user2';
    user2.userType = V1_UserType.WORKFORCE_USER;

    const dataContract = new V1_DataContract();
    dataContract.consumer = adhocTeam;

    expect(
      await isMemberOfContract(
        user,
        dataContract,
        lakehouseContractServerClient,
        undefined,
      ),
    ).toBe(false);
  });

  test('isMemberOfContract should return true if the user belongs to the contract members', async () => {
    const lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: 'http://test-lakehouse-contract-server-client',
    });

    const user = 'user1';

    const dataContract = new V1_DataContract();
    dataContract.consumer = new V1_UnknownOrganizationalScopeType();
    dataContract.members = [
      {
        guid: 'test-guid',
        user: {
          name: 'user1',
          userType: V1_UserType.WORKFORCE_USER,
        },
        status: V1_UserApprovalStatus.APPROVED,
      },
    ];

    expect(
      await isMemberOfContract(
        user,
        dataContract,
        lakehouseContractServerClient,
        undefined,
      ),
    ).toBe(true);
  });

  test('isMemberOfContract should return false if the user does not belong to the contract members', async () => {
    const lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: 'http://test-lakehouse-contract-server-client',
    });

    const user = 'user1';

    const dataContract = new V1_DataContract();
    dataContract.consumer = new V1_UnknownOrganizationalScopeType();
    dataContract.members = [
      {
        guid: 'test-guid',
        user: {
          name: 'user2',
          userType: V1_UserType.WORKFORCE_USER,
        },
        status: V1_UserApprovalStatus.APPROVED,
      },
    ];

    expect(
      await isMemberOfContract(
        user,
        dataContract,
        lakehouseContractServerClient,
        undefined,
      ),
    ).toBe(false);
  });

  test('isMemberOfContract should return true if the user belongs to the contract tasks', async () => {
    const lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: 'http://test-lakehouse-contract-server-client',
    });

    const user = 'user1';

    createSpy(
      lakehouseContractServerClient,
      'getContractTasks',
    ).mockResolvedValue({
      tasks: [
        {
          assignees: ['test-privilege-manager-user-id'],
          rec: {
            consumer: user,
            dataContractId: 'test-data-contract-id',
            status: V1_UserApprovalStatus.PENDING,
            taskId: 'mock-privilege-manager-approval-task-id',
            type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
          },
        },
      ],
    });

    const dataContract = new V1_DataContract();
    dataContract.consumer = new V1_UnknownOrganizationalScopeType();

    expect(
      await isMemberOfContract(
        user,
        dataContract,
        lakehouseContractServerClient,
        undefined,
      ),
    ).toBe(true);
  });

  test('isMemberOfContract should return false if the user does not belong to the contract tasks', async () => {
    const lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: 'http://test-lakehouse-contract-server-client',
    });

    const user = 'user1';

    createSpy(
      lakehouseContractServerClient,
      'getContractTasks',
    ).mockResolvedValue({
      tasks: [
        {
          assignees: ['test-privilege-manager-user-id'],
          rec: {
            consumer: 'user2',
            dataContractId: 'test-data-contract-id',
            status: V1_UserApprovalStatus.PENDING,
            taskId: 'mock-privilege-manager-approval-task-id',
            type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
          },
        },
      ],
    });

    const dataContract = new V1_DataContract();
    dataContract.consumer = new V1_UnknownOrganizationalScopeType();

    expect(
      await isMemberOfContract(
        user,
        dataContract,
        lakehouseContractServerClient,
        undefined,
      ),
    ).toBe(false);
  });

  test('contractContainsSystemAccount should return true if an ad-hoc team contract contains a system account user', async () => {
    const adhocTeam = new V1_AdhocTeam();
    const user1 = new V1_User();
    user1.name = 'system-user1';
    user1.userType = V1_UserType.SYSTEM_ACCOUNT;
    adhocTeam.users = [user1];

    const dataContract = new V1_DataContract();
    dataContract.consumer = adhocTeam;

    expect(contractContainsSystemAccount(dataContract)).toBe(true);
  });

  test('contractContainsSystemAccount should return false if an ad-hoc team contract does not contain a system account user', async () => {
    const adhocTeam = new V1_AdhocTeam();
    const user1 = new V1_User();
    user1.name = 'user1';
    user1.userType = V1_UserType.WORKFORCE_USER;
    adhocTeam.users = [user1];

    const dataContract = new V1_DataContract();
    dataContract.consumer = adhocTeam;

    expect(contractContainsSystemAccount(dataContract)).toBe(false);
  });

  test('contractContainsSystemAccount should return true if contract members contain a system account user', async () => {
    const dataContract = new V1_DataContract();
    dataContract.consumer = new V1_UnknownOrganizationalScopeType();
    dataContract.members = [
      {
        guid: 'test-guid',
        user: {
          name: 'user1',
          userType: V1_UserType.SYSTEM_ACCOUNT,
        },
        status: V1_UserApprovalStatus.APPROVED,
      },
    ];

    expect(contractContainsSystemAccount(dataContract)).toBe(true);
  });

  test('contractContainsSystemAccount should return false if contract members do not contain a system account user', async () => {
    const dataContract = new V1_DataContract();
    dataContract.consumer = new V1_UnknownOrganizationalScopeType();
    dataContract.members = [
      {
        guid: 'test-guid',
        user: {
          name: 'user1',
          userType: V1_UserType.WORKFORCE_USER,
        },
        status: V1_UserApprovalStatus.APPROVED,
      },
    ];

    expect(contractContainsSystemAccount(dataContract)).toBe(false);
  });
});
