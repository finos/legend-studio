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
  type GraphManagerState,
  type V1_AccessPointGroup,
  type V1_DataContract,
  type V1_EntitlementsDataProductDetails,
  type V1_OrganizationalScope,
  CORE_PURE_PATH,
  DataProduct,
  V1_AccessPointGroupReference,
  V1_AdHocDeploymentDataProductOrigin,
  V1_AdhocTeam,
  V1_AppDirOrganizationalScope,
  V1_ContractState,
  V1_DataProduct,
  V1_dataProductModelSchema,
  V1_PureGraphManager,
  V1_SdlcDeploymentDataProductOrigin,
  V1_UnknownOrganizationalScopeType,
} from '@finos/legend-graph';
import type { LegendMarketplaceApplicationPlugin } from '../../application/LegendMarketplaceApplicationPlugin.js';
import {
  ActionState,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import type React from 'react';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { resolveVersion } from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-storage';
import { deserialize } from 'serializr';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';

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
      Number(dataProductDeploymentID) ===
      contractResource.dataProduct.owner.appDirId;
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

export const getOrganizationalScopeTypeDetails = (
  scope: V1_OrganizationalScope,
  plugins: LegendMarketplaceApplicationPlugin[],
): React.ReactNode => {
  if (scope instanceof V1_AppDirOrganizationalScope) {
    return <>AppDir Node</>;
  } else if (scope instanceof V1_AdhocTeam) {
    return <>Ad-hoc Team</>;
  } else if (scope instanceof V1_UnknownOrganizationalScopeType) {
    return <>Unknown</>;
  } else {
    const detailsRenderers = plugins
      .flatMap((plugin) =>
        plugin
          .getContractConsumerTypeRendererConfigs?.()
          .flatMap((config) => config.organizationalScopeTypeDetailsRenderer),
      )
      .filter(isNonNullable);
    for (const detailsRenderer of detailsRenderers) {
      const detailsComponent = detailsRenderer(scope);
      if (detailsComponent) {
        return detailsComponent;
      }
    }

    return <>Unknown</>;
  }
};

export const getDataProductFromDetails = async (
  details: V1_EntitlementsDataProductDetails,
  graphManagerState: GraphManagerState,
  marketplaceBaseStore: LegendMarketplaceBaseStore,
): Promise<V1_DataProduct | undefined> => {
  if (details.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
    const rawEntities =
      (await marketplaceBaseStore.depotServerClient.getVersionEntities(
        details.origin.group,
        details.origin.artifact,
        resolveVersion(details.origin.version),
        CORE_PURE_PATH.DATA_PRODUCT,
      )) as {
        artifactId: string;
        entity: Entity;
        groupId: string;
        versionId: string;
        versionedEntity: boolean;
      }[];
    const entities = rawEntities.map((entity) =>
      deserialize(V1_dataProductModelSchema, entity.entity.content),
    );
    const matchingEntities = entities.filter(
      (entity) => entity.name.toLowerCase() === details.id.toLowerCase(),
    );
    if (matchingEntities.length === 0) {
      throw new Error(
        `No data product found with name ${details.id} in project`,
      );
    } else if (matchingEntities.length > 1) {
      throw new Error(
        `Multiple data products found with name ${details.id} in project`,
      );
    }
    return matchingEntities[0];
  } else if (details.origin instanceof V1_AdHocDeploymentDataProductOrigin) {
    // Crete graph manager for parsing ad-hoc deployed data products
    const graphManager = new V1_PureGraphManager(
      marketplaceBaseStore.applicationStore.pluginManager,
      marketplaceBaseStore.applicationStore.logService,
      marketplaceBaseStore.remoteEngine,
    );
    await graphManager.initialize(
      {
        env: marketplaceBaseStore.applicationStore.config.env,
        tabSize: DEFAULT_TAB_SIZE,
        clientConfig: {
          baseUrl: marketplaceBaseStore.applicationStore.config.engineServerUrl,
        },
      },
      { engine: marketplaceBaseStore.remoteEngine },
    );
    const entities: Entity[] = await graphManager.pureCodeToEntities(
      details.origin.definition,
    );
    await graphManager.buildGraph(
      graphManagerState.graph,
      entities,
      ActionState.create(),
    );
    const matchingEntities = graphManagerState.graph.allElements.filter(
      (element) =>
        element instanceof DataProduct &&
        element.name.toLowerCase() === details.id.toLowerCase(),
    );
    if (matchingEntities.length > 1) {
      throw new Error(
        `Multiple data products found with name ${details.id} in deployed definition`,
      );
    }
    return guaranteeType(
      graphManager.elementToProtocol(
        guaranteeNonNullable(
          matchingEntities[0],
          `No data product found with name ${details.id} in deployed definition`,
        ),
      ),
      V1_DataProduct,
      `${details.id} is not a data product`,
    );
  } else {
    return undefined;
  }
};
