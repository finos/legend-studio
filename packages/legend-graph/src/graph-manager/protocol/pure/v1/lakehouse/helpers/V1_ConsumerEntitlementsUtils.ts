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
  V1_ResourceType,
  type V1_DataContract,
  type V1_LiteDataContract,
} from '../entitlements/V1_ConsumerEntitlements.js';
import { guaranteeType } from '@finos/legend-shared';

export const V1_transformDataContractToLiteDatacontract = (
  dataContract: V1_DataContract,
): V1_LiteDataContract => {
  const accessPointGroupReference = guaranteeType(
    dataContract.resource,
    V1_AccessPointGroupReference,
    'Only access point group reference is supported',
  );
  const liteDataContract: V1_LiteDataContract = {
    description: dataContract.description,
    guid: dataContract.guid,
    version: dataContract.version,
    state: dataContract.state,
    members: dataContract.members,
    consumer: dataContract.consumer,
    createdBy: dataContract.createdBy,
    resourceId: accessPointGroupReference.dataProduct.name,
    resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
    deploymentId: accessPointGroupReference.dataProduct.owner.appDirId,
    accessPointGroup: accessPointGroupReference.accessPointGroup,
  };
  return liteDataContract;
};
