/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  hashArray,
  type Hashable,
  type PlainObject,
} from '@finos/legend-shared';
import {
  V1_PackageableElement,
  type V1_PackageableElementVisitor,
} from '../V1_PackageableElement.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_AppDirNode } from '../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import {
  SnowflakeWarehouseType as V1_SnowflakeWarehouseType,
  SnowflakeWarehouseSize as V1_SnowflakeWarehouseSize,
  SnowflakeResourceConstraint as V1_SnowflakeResourceConstraint,
  SnowflakeScalingPolicy as V1_SnowflakeScalingPolicy,
  DatabricksClusterSize as V1_DatabricksClusterSize,
  DatabricksSpotInstancePolicy as V1_DatabricksSpotInstancePolicy,
} from '../../../../../../../graph/metamodel/pure/compute/Compute.js';

export {
  V1_SnowflakeWarehouseType,
  V1_SnowflakeWarehouseSize,
  V1_SnowflakeResourceConstraint,
  V1_SnowflakeScalingPolicy,
  V1_DatabricksClusterSize,
  V1_DatabricksSpotInstancePolicy,
};

export const V1_COMPUTE_ELEMENT_PROTOCOL_TYPE = 'compute';

export const V1_COMPUTE_OWNER_APP_DIR_TYPE = 'appDir';

export class V1_AppDirComputeOwner implements Hashable {
  production: V1_AppDirNode | undefined;
  prodParallel: V1_AppDirNode | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.COMPUTE_APP_DIR_OWNER,
      this.production?.hashCode ?? '',
      this.prodParallel?.hashCode ?? '',
    ]);
  }
}

export enum V1_ComputeSpecificationType {
  SNOWFLAKE = 'snowflakeComputeSpecification',
  DATABRICKS = 'databricksComputeSpecification',
}

export abstract class V1_ComputeSpecification implements Hashable {
  abstract get hashCode(): string;
}

export class V1_UnknownComputeSpecification
  extends V1_ComputeSpecification
  implements Hashable
{
  content!: PlainObject;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_COMPUTE_SPECIFICATION,
      hashObjectWithoutSourceInformation(this.content),
    ]);
  }
}

export class V1_SnowflakeComputeSpecification
  extends V1_ComputeSpecification
  implements Hashable
{
  warehouseType: V1_SnowflakeWarehouseType | undefined;
  warehouseSize: V1_SnowflakeWarehouseSize | undefined;
  resourceConstraint: V1_SnowflakeResourceConstraint | undefined;
  maxClusterCount: number | undefined;
  minClusterCount: number | undefined;
  scalingPolicy: V1_SnowflakeScalingPolicy | undefined;
  autoSuspend: number | undefined;
  autoResume: boolean | undefined;
  resourceMonitor: string | undefined;
  comment: string | undefined;
  enableQueryAcceleration: boolean | undefined;
  queryAccelerationMaxScaleFactor: number | undefined;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_COMPUTE_SPECIFICATION,
      this.warehouseType ?? '',
      this.warehouseSize ?? '',
      this.resourceConstraint ?? '',
      this.maxClusterCount?.toString() ?? '',
      this.minClusterCount?.toString() ?? '',
      this.scalingPolicy ?? '',
      this.autoSuspend?.toString() ?? '',
      this.autoResume?.toString() ?? '',
      this.resourceMonitor ?? '',
      this.comment ?? '',
      this.enableQueryAcceleration?.toString() ?? '',
      this.queryAccelerationMaxScaleFactor?.toString() ?? '',
    ]);
  }
}

export class V1_DatabricksTag implements Hashable {
  key!: string;
  value!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABRICKS_TAG,
      this.key,
      this.value,
    ]);
  }
}

export class V1_DatabricksComputeSpecification
  extends V1_ComputeSpecification
  implements Hashable
{
  clusterSize: V1_DatabricksClusterSize | undefined;
  autoStopMins: number | undefined;
  minNumClusters: number | undefined;
  maxNumClusters: number | undefined;
  enablePhoton: boolean | undefined;
  spotInstancePolicy: V1_DatabricksSpotInstancePolicy | undefined;
  tags: V1_DatabricksTag[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABRICKS_COMPUTE_SPECIFICATION,
      this.clusterSize ?? '',
      this.autoStopMins?.toString() ?? '',
      this.minNumClusters?.toString() ?? '',
      this.maxNumClusters?.toString() ?? '',
      this.enablePhoton?.toString() ?? '',
      this.spotInstancePolicy ?? '',
      hashArray(this.tags),
    ]);
  }
}

export class V1_Compute extends V1_PackageableElement implements Hashable {
  owner!: V1_AppDirComputeOwner;
  specification!: V1_ComputeSpecification;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.COMPUTE,
      this.path,
      this.owner,
      this.specification,
    ]);
  }

  override accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Compute(this);
  }
}
