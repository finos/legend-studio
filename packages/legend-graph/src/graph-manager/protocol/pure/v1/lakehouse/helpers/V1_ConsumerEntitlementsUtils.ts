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
  V1_AccessPointGroupReference,
  V1_DataBundle,
  V1_ResourceType,
  type V1_DataContract,
  type V1_LiteDataContract,
} from '../entitlements/V1_ConsumerEntitlements.js';

export const V1_transformDataContractToLiteDatacontract = (
  dataContract: V1_DataContract,
): V1_LiteDataContract => {
  const dataProductName =
    dataContract.resource instanceof V1_AccessPointGroupReference
      ? dataContract.resource.dataProduct.name
      : 'Unknown';
  const deploymentId =
    dataContract.resource instanceof V1_AccessPointGroupReference
      ? dataContract.resource.dataProduct.owner.appDirId
      : -1;
  const accessPointGroup =
    dataContract.resource instanceof V1_AccessPointGroupReference
      ? dataContract.resource.accessPointGroup
      : 'Unknown';
  const resourceType =
    dataContract.resource instanceof V1_AccessPointGroupReference
      ? V1_ResourceType.ACCESS_POINT_GROUP
      : dataContract.resource instanceof V1_DataBundle
        ? V1_ResourceType.DATA_BUNDLE
        : V1_ResourceType.UNKNOWN;
  const liteDataContract: V1_LiteDataContract = {
    description: dataContract.description,
    guid: dataContract.guid,
    version: dataContract.version,
    state: dataContract.state,
    members: dataContract.members,
    consumer: dataContract.consumer,
    createdBy: dataContract.createdBy,
    resourceId: dataProductName,
    createdAt: dataContract.createdAt,
    resourceType,
    deploymentId,
    accessPointGroup,
  };
  return liteDataContract;
};
