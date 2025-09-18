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
  type V1_AccessPointGroup,
  type V1_DataContract,
  type V1_DataProduct,
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_ContractState,
  V1_deserializeTaskResponse,
  V1_LiteDataContract,
  V1_UserType,
} from '@finos/legend-graph';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';

const invalidContractState = [
  V1_ContractState.DRAFT,
  V1_ContractState.REJECTED,
  V1_ContractState.CLOSED,
];

export const dataContractContainsDataProduct = (
  dataProduct: V1_DataProduct,
  dataProductDeploymentID: number,
  dataContract: V1_DataContract,
): boolean => {
  if (invalidContractState.includes(dataContract.state)) {
    return false;
  }
  const contractResource = dataContract.resource;
  if (
    contractResource instanceof V1_AccessPointGroupReference &&
    dataProductDeploymentID
  ) {
    const didMatch =
      dataProductDeploymentID === contractResource.dataProduct.owner.appDirId;
    const nameMatch =
      contractResource.dataProduct.name.toLowerCase() ===
      dataProduct.name.toLowerCase();
    const dataProductContainsContractAPG = dataProduct.accessPointGroups
      .map((e) => e.id)
      .includes(contractResource.accessPointGroup);
    return didMatch && nameMatch && dataProductContainsContractAPG;
  }

  return false;
};

// Assume contract already part of data product
export const dataContractContainsAccessGroup = (
  group: V1_AccessPointGroup,
  dataContract: V1_DataContract,
): boolean => {
  const contractResource = dataContract.resource;
  if (contractResource instanceof V1_AccessPointGroupReference) {
    return contractResource.accessPointGroup === group.id;
  }
  return false;
};

export const isContractInTerminalState = (
  contract: V1_DataContract | V1_LiteDataContract,
): boolean => {
  return [
    V1_ContractState.CLOSED,
    V1_ContractState.COMPLETED,
    V1_ContractState.REJECTED,
  ].includes(contract.state);
};

export const isMemberOfContract = async (
  user: string,
  contract: V1_DataContract,
  lakehouseContractServerClient: LakehouseContractServerClient,
  token: string | undefined,
): Promise<boolean> => {
  const consumer = contract.consumer;
  if (consumer instanceof V1_AdhocTeam) {
    return consumer.users.some((e) => e.name === user);
  } else if (contract.members.length > 0) {
    return contract.members.some((e) => e.user.name === user);
  } else {
    // If consumer is not an ad-hoc team and the contract's members are not defined,
    // we will fetch the tasks and use the tasks to determine if user is a member
    // of the contract.
    const rawTasks = await lakehouseContractServerClient.getContractTasks(
      contract.guid,
      token,
    );
    const tasks = V1_deserializeTaskResponse(rawTasks);
    return tasks.some((task) => task.rec.consumer === user);
  }
};

export const contractContainsSystemAccount = (
  contract: V1_DataContract,
): boolean => {
  return (
    (contract.consumer instanceof V1_AdhocTeam &&
      contract.consumer.users.some(
        (_user) => _user.userType === V1_UserType.SYSTEM_ACCOUNT,
      )) ||
    contract.members.some(
      (_user) => _user.user.userType === V1_UserType.SYSTEM_ACCOUNT,
    )
  );
};
