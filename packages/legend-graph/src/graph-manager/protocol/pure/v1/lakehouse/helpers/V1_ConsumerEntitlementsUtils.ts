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
  V1_LiteDataContract,
  V1_LiteDataAccessRequest,
  V1_ResourceType,
  type V1_DataContract,
} from '../entitlements/V1_ConsumerEntitlements.js';
import {
  V1_AccessPointGroupReference,
  V1_DataBundle,
} from '../entitlements/V1_CoreEntitlements.js';
import type { V1_DataRequestWithWorkflow } from '../entitlements/V1_DataAccessRequest.js';

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
  const liteDataContract = new V1_LiteDataContract();
  liteDataContract.description = dataContract.description;
  liteDataContract.guid = dataContract.guid;
  liteDataContract.version = dataContract.version;
  liteDataContract.state = dataContract.state;
  liteDataContract.members = dataContract.members;
  liteDataContract.consumer = dataContract.consumer;
  liteDataContract.createdBy = dataContract.createdBy;
  liteDataContract.resourceId = dataProductName;
  liteDataContract.createdAt = dataContract.createdAt;
  liteDataContract.resourceType = resourceType;
  liteDataContract.deploymentId = deploymentId;
  liteDataContract.accessPointGroup = accessPointGroup;
  return liteDataContract;
};

export const V1_transformDataRequestWithWorkflowToLiteDataAccessRequest = (
  detail: V1_DataRequestWithWorkflow,
): V1_LiteDataAccessRequest => {
  const dataRequest = detail.dataRequest;
  const resource = dataRequest.resource;
  const dataProductName =
    resource instanceof V1_AccessPointGroupReference
      ? resource.dataProduct.name
      : 'Unknown';
  const deploymentId =
    resource instanceof V1_AccessPointGroupReference
      ? resource.dataProduct.owner.appDirId
      : 0;
  const accessPointGroup =
    resource instanceof V1_AccessPointGroupReference
      ? resource.accessPointGroup
      : undefined;

  const request = new V1_LiteDataAccessRequest();
  request.guid = dataRequest.guid;
  request.description = dataRequest.businessJustification;
  request.createdBy = dataRequest.createdBy;
  request.consumer = dataRequest.consumer;
  request.resourceId = dataProductName;
  request.resourceType = V1_ResourceType.ACCESS_POINT_GROUP;
  request.deploymentId = deploymentId;
  if (accessPointGroup !== undefined) {
    request.accessPointGroup = accessPointGroup;
  }
  request.state = dataRequest.state;
  request.members = dataRequest.members;

  const firstTask = detail.workflows[0]?.tasks[0];
  request.createdAt = firstTask
    ? new Date(firstTask.createdOn).toISOString()
    : '';

  return request;
};
