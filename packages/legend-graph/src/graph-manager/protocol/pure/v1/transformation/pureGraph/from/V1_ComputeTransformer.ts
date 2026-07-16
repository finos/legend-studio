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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type AppDirComputeOwner,
  type Compute,
  type ComputeSpecification,
  type DatabricksTag,
  DatabricksComputeSpecification,
  SnowflakeComputeSpecification,
  UnknownComputeSpecification,
} from '../../../../../../../graph/metamodel/pure/compute/Compute.js';
import { V1_AppDirNode } from '../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import {
  V1_AppDirComputeOwner,
  V1_Compute,
  type V1_ComputeSpecification,
  V1_DatabricksComputeSpecification,
  V1_DatabricksTag,
  V1_SnowflakeComputeSpecification,
  V1_UnknownComputeSpecification,
} from '../../../model/packageableElements/compute/V1_Compute.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';

const V1_transformSnowflakeComputeSpecification = (
  spec: SnowflakeComputeSpecification,
): V1_SnowflakeComputeSpecification => {
  const v1Spec = new V1_SnowflakeComputeSpecification();
  v1Spec.warehouseType = spec.warehouseType;
  v1Spec.warehouseSize = spec.warehouseSize;
  v1Spec.resourceConstraint = spec.resourceConstraint;
  v1Spec.maxClusterCount = spec.maxClusterCount;
  v1Spec.minClusterCount = spec.minClusterCount;
  v1Spec.scalingPolicy = spec.scalingPolicy;
  v1Spec.autoSuspend = spec.autoSuspend;
  v1Spec.autoResume = spec.autoResume;
  v1Spec.resourceMonitor = spec.resourceMonitor;
  v1Spec.comment = spec.comment;
  v1Spec.enableQueryAcceleration = spec.enableQueryAcceleration;
  v1Spec.queryAccelerationMaxScaleFactor = spec.queryAccelerationMaxScaleFactor;
  return v1Spec;
};

const V1_transformDatabricksTag = (tag: DatabricksTag): V1_DatabricksTag => {
  const v1Tag = new V1_DatabricksTag();
  v1Tag.key = tag.key;
  v1Tag.value = tag.value;
  return v1Tag;
};

const V1_transformDatabricksComputeSpecification = (
  spec: DatabricksComputeSpecification,
): V1_DatabricksComputeSpecification => {
  const v1Spec = new V1_DatabricksComputeSpecification();
  v1Spec.clusterSize = spec.clusterSize;
  v1Spec.autoStopMins = spec.autoStopMins;
  v1Spec.minNumClusters = spec.minNumClusters;
  v1Spec.maxNumClusters = spec.maxNumClusters;
  v1Spec.enablePhoton = spec.enablePhoton;
  v1Spec.spotInstancePolicy = spec.spotInstancePolicy;
  v1Spec.tags = spec.tags.map(V1_transformDatabricksTag);
  return v1Spec;
};

const V1_transformUnknownComputeSpecification = (
  spec: UnknownComputeSpecification,
): V1_UnknownComputeSpecification => {
  const v1Spec = new V1_UnknownComputeSpecification();
  v1Spec.content = spec.content;
  return v1Spec;
};

const V1_transformComputeOwner = (
  owner: AppDirComputeOwner,
): V1_AppDirComputeOwner => {
  const v1Owner = new V1_AppDirComputeOwner();
  if (owner.production) {
    const v1Node = new V1_AppDirNode();
    v1Node.appDirId = owner.production.appDirId;
    v1Node.level = owner.production.level;
    v1Owner.production = v1Node;
  }
  if (owner.prodParallel) {
    const v1Node = new V1_AppDirNode();
    v1Node.appDirId = owner.prodParallel.appDirId;
    v1Node.level = owner.prodParallel.level;
    v1Owner.prodParallel = v1Node;
  }
  return v1Owner;
};

const V1_transformComputeSpecification = (
  spec: ComputeSpecification,
): V1_ComputeSpecification => {
  if (spec instanceof SnowflakeComputeSpecification) {
    return V1_transformSnowflakeComputeSpecification(spec);
  } else if (spec instanceof DatabricksComputeSpecification) {
    return V1_transformDatabricksComputeSpecification(spec);
  } else if (spec instanceof UnknownComputeSpecification) {
    return V1_transformUnknownComputeSpecification(spec);
  }
  throw new UnsupportedOperationError(
    `Unable to transform compute specification`,
  );
};

export const V1_transformCompute = (element: Compute): V1_Compute => {
  const compute = new V1_Compute();
  V1_initPackageableElement(compute, element);
  compute.owner = V1_transformComputeOwner(element.owner);
  compute.specification = V1_transformComputeSpecification(
    element.specification,
  );
  return compute;
};
