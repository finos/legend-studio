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
  type V1_OrganizationalScope,
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_AppDirOrganizationalScope,
  V1_ContractState,
  V1_UnknownOrganizationalScopeType,
} from '@finos/legend-graph';
import type { LegendMarketplaceApplicationPlugin } from '../../application/LegendMarketplaceApplicationPlugin.js';
import { isNonNullable } from '@finos/legend-shared';

const invalidContractState = [
  V1_ContractState.DRAFT,
  V1_ContractState.REJECTED,
  V1_ContractState.CLOSED,
];

export const dataContractContainsDataProduct = (
  dataProduct: V1_DataProduct,
  dataProdcutDeploymentID: string | undefined,
  dataContract: V1_DataContract,
): boolean => {
  if (invalidContractState.includes(dataContract.state)) {
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

export const isContractInTerminalState = (
  contract: V1_DataContract,
): boolean => {
  return [
    V1_ContractState.CLOSED,
    V1_ContractState.COMPLETED,
    V1_ContractState.REJECTED,
  ].includes(contract.state);
};

export const stringifyOrganizationalScope = (
  scope: V1_OrganizationalScope,
): string => {
  if (scope instanceof V1_AppDirOrganizationalScope) {
    return scope.appDirNode
      .map((node) => `${node.level}: ${node.appDirId}`)
      .join(', ');
  } else if (scope instanceof V1_AdhocTeam) {
    return scope.users.map((user) => user.name).join(', ');
  } else if (scope instanceof V1_UnknownOrganizationalScopeType) {
    return JSON.stringify(scope.content);
  }
  return '';
};

export const getOrganizationalScopeDetails = (
  scope: V1_OrganizationalScope,
  plugins: LegendMarketplaceApplicationPlugin[],
): string => {
  if (scope instanceof V1_AppDirOrganizationalScope) {
    return 'AppDir Node';
  } else if (scope instanceof V1_AdhocTeam) {
    return 'Ad-hoc Team';
  } else if (scope instanceof V1_UnknownOrganizationalScopeType) {
    return 'Unknown';
  } else {
    const detailsFunctions = plugins
      .flatMap((plugin) =>
        plugin
          .getContractConsumerTypeRendererConfigs?.()
          ?.flatMap((config) => config.getOrganizationalScopeDetails),
      )
      .filter(isNonNullable);
    for (const detailsFunction of detailsFunctions) {
      const details = detailsFunction(scope);
      if (details) {
        return details;
      }
    }

    return 'Unknown';
  }
};
