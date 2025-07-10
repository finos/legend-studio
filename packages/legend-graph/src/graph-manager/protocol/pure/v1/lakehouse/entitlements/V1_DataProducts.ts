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

import { type V1_AppDirNode } from './V1_CoreEntitlements.js';
import type { V1_StereotypePtr } from '../../model/packageableElements/domain/V1_StereotypePtr.js';

export abstract class V1_DataProductOrigin {
  type!: string;
}

export class V1_AdHocDeploymentDataProductOrigin extends V1_DataProductOrigin {
  definition!: string;
}

export class V1_SdlcDeploymentDataProductOrigin extends V1_DataProductOrigin {
  group!: string;
  artifact!: string;
  version!: string;
}

export enum V1_LakehouseEnvironmentType {
  PRODUCTION = 'PRODUCTION',
  PRODUCTION_PARALLEL = 'PRODUCTION_PARALLEL',
  DEVELOPMENT = 'DEVELOPMENT',
}

export class V1_LakehouseEnvironment {
  producerEnvironmentName!: string;
  type!: V1_LakehouseEnvironmentType;
}

export class V1_LakehouseDataProductAccessPoint {
  name!: string;
  groups: string[] = [];
}

export class V1_AccessPointGroupStereotypeMapping {
  accessPointGroup!: string;
  stereotypes: V1_StereotypePtr[] = [];
}

export class V1_LakehouseDataProduct {
  name!: string;
  accessPoints!: V1_LakehouseDataProductAccessPoint[];
  accessPointGroupStereotypeMappings: V1_AccessPointGroupStereotypeMapping[] =
    [];
  owner!: V1_AppDirNode;
}

export class V1_DataProductDetails {
  id!: string;
  deploymentId!: number;
  origin?: V1_DataProductOrigin;
  lakehouseEnvironment?: V1_LakehouseEnvironment;
  dataProduct!: V1_LakehouseDataProduct;
}

export class V1_DataProductDetailsResponse {
  dataProducts!: V1_DataProductDetails[];
}
