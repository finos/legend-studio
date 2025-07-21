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
import type { PlainObject } from '@finos/legend-shared';

export abstract class V1_EntitlementsDataProductOrigin {}

export class V1_AdHocDeploymentDataProductOrigin extends V1_EntitlementsDataProductOrigin {
  definition!: string;
}

export class V1_SdlcDeploymentDataProductOrigin extends V1_EntitlementsDataProductOrigin {
  group!: string;
  artifact!: string;
  version!: string;
}

export class V1_UnknownDataProductOriginType extends V1_EntitlementsDataProductOrigin {
  content!: PlainObject;
}

export enum V1_EntitlementsLakehouseEnvironmentType {
  PRODUCTION = 'PRODUCTION',
  PRODUCTION_PARALLEL = 'PRODUCTION_PARALLEL',
  DEVELOPMENT = 'DEVELOPMENT',
}

export class V1_EntitlementsLakehouseEnvironment {
  producerEnvironmentName!: string;
  type!: V1_EntitlementsLakehouseEnvironmentType;
}

export class V1_EntitlementsAccessPoint {
  name!: string;
  groups: string[] = [];
}

export class V1_AccessPointGroupStereotypeMapping {
  accessPointGroup!: string;
  stereotypes: V1_StereotypePtr[] = [];
}

export class V1_EntitlementsDataProduct {
  name!: string;
  accessPoints: V1_EntitlementsAccessPoint[] = [];
  accessPointGroupStereotypeMappings: V1_AccessPointGroupStereotypeMapping[] =
    [];
  owner!: V1_AppDirNode;
}

export class V1_EntitlementsDataProductDetails {
  id!: string;
  deploymentId!: number;
  title?: string;
  description?: string;
  origin?: V1_EntitlementsDataProductOrigin | null;
  lakehouseEnvironment?: V1_EntitlementsLakehouseEnvironment;
  dataProduct!: V1_EntitlementsDataProduct;
}

export class V1_EntitlementsDataProductDetailsResponse {
  dataProducts: V1_EntitlementsDataProductDetails[] = [];
}
