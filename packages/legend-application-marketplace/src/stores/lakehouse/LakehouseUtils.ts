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
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_ContractState,
  type V1_DataContract,
  type V1_DataProduct,
} from '@finos/legend-graph';

const inValidContractState = [
  V1_ContractState.DRAFT,
  V1_ContractState.REJECTED,
  V1_ContractState.CLOSED,
];

const inProgressContractState = [
  V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
  V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
];

export const dataContractContainsDataProduct = (
  dataProduct: V1_DataProduct,
  dataProdcutDeploymentID: string | undefined,
  dataContract: V1_DataContract,
): boolean => {
  if (inValidContractState.includes(dataContract.state)) {
    return false;
  }
  const contractResource = dataContract.resource;
  if (
    contractResource instanceof V1_AccessPointGroupReference &&
    dataProdcutDeploymentID
  ) {
    const sameDID =
      Number(dataProdcutDeploymentID) ===
      contractResource.dataProduct.owner.appDirId;
    // revisit name
    const isName = contractResource.dataProduct.name === dataProduct.name;
    const hasGroup = dataProduct.accessPointGroups
      .map((e) => e.id)
      .includes(contractResource.accessPointGroup);
    return sameDID && isName && hasGroup;
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

export const isMemberOfContract = (
  user: string,
  contract: V1_DataContract,
): boolean => {
  const consumer = contract.consumer;
  if (consumer instanceof V1_AdhocTeam) {
    return consumer.users.some((e) => e.name === user);
  }
  return false;
};

export const isContractCompleted = (contract: V1_DataContract): boolean => {
  return contract.state === V1_ContractState.COMPLETED;
};

export const isContractPending = (contract: V1_DataContract): boolean => {
  return inProgressContractState.includes(contract.state);
};
