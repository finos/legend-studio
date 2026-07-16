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
  uuid,
} from '@finos/legend-shared';
import {
  PackageableElement,
  type PackageableElementVisitor,
} from '../packageableElements/PackageableElement.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../Core_HashUtils.js';
import type { AppDirNode } from '../packageableElements/ingest/IngestDefinition.js';

export class AppDirComputeOwner implements Hashable {
  production: AppDirNode | undefined;
  prodParallel: AppDirNode | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.COMPUTE_APP_DIR_OWNER,
      this.production?.hashCode ?? '',
      this.prodParallel?.hashCode ?? '',
    ]);
  }
}

export abstract class ComputeSpecification implements Hashable {
  abstract get hashCode(): string;
}

export class UnknownComputeSpecification
  extends ComputeSpecification
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

export enum SnowflakeWarehouseType {
  STANDARD = 'STANDARD',
  SNOWPARK_OPTIMIZED = 'SNOWPARK_OPTIMIZED',
  ADAPTIVE = 'ADAPTIVE',
}

export enum SnowflakeWarehouseSize {
  XSMALL = 'XSMALL',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  XLARGE = 'XLARGE',
  XXLARGE = 'XXLARGE',
  XXXLARGE = 'XXXLARGE',
  X4LARGE = 'X4LARGE',
  X5LARGE = 'X5LARGE',
  X6LARGE = 'X6LARGE',
}

export enum SnowflakeResourceConstraint {
  STANDARD_GEN_1 = 'STANDARD_GEN_1',
  STANDARD_GEN_2 = 'STANDARD_GEN_2',
  MEMORY_1X = 'MEMORY_1X',
  MEMORY_1X_x86 = 'MEMORY_1X_x86',
  MEMORY_16X = 'MEMORY_16X',
  MEMORY_16X_x86 = 'MEMORY_16X_x86',
  MEMORY_64X = 'MEMORY_64X',
  MEMORY_64X_x86 = 'MEMORY_64X_x86',
}

export enum SnowflakeScalingPolicy {
  STANDARD = 'STANDARD',
  ECONOMY = 'ECONOMY',
}

export class SnowflakeComputeSpecification
  extends ComputeSpecification
  implements Hashable
{
  warehouseType: SnowflakeWarehouseType | undefined;
  warehouseSize: SnowflakeWarehouseSize | undefined;
  resourceConstraint: SnowflakeResourceConstraint | undefined;
  maxClusterCount: number | undefined;
  minClusterCount: number | undefined;
  scalingPolicy: SnowflakeScalingPolicy | undefined;
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

export enum DatabricksClusterSize {
  XXSMALL = 'XXSMALL',
  XSMALL = 'XSMALL',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  XLARGE = 'XLARGE',
  XXLARGE = 'XXLARGE',
  XXXLARGE = 'XXXLARGE',
  X4LARGE = 'X4LARGE',
  X5LARGE = 'X5LARGE',
}

export enum DatabricksSpotInstancePolicy {
  POLICY_UNSPECIFIED = 'POLICY_UNSPECIFIED',
  COST_OPTIMIZED = 'COST_OPTIMIZED',
  RELIABILITY_OPTIMIZED = 'RELIABILITY_OPTIMIZED',
}

export class DatabricksTag implements Hashable {
  readonly _UUID = uuid();
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

export class DatabricksComputeSpecification
  extends ComputeSpecification
  implements Hashable
{
  clusterSize: DatabricksClusterSize | undefined;
  autoStopMins: number | undefined;
  minNumClusters: number | undefined;
  maxNumClusters: number | undefined;
  enablePhoton: boolean | undefined;
  spotInstancePolicy: DatabricksSpotInstancePolicy | undefined;
  tags: DatabricksTag[] = [];

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

export class Compute extends PackageableElement {
  owner!: AppDirComputeOwner;
  specification!: ComputeSpecification;

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Compute(this);
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.COMPUTE,
      this.path,
      this.owner,
      this.specification,
    ]);
  }
}
