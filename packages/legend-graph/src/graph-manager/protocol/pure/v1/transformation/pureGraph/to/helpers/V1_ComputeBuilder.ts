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
  AppDirComputeOwner,
  type ComputeSpecification,
  DatabricksComputeSpecification,
  DatabricksTag,
  SnowflakeComputeSpecification,
  UnknownComputeSpecification,
} from '../../../../../../../../graph/metamodel/pure/compute/Compute.js';
import { AppDirNode } from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import {
  type V1_AppDirComputeOwner,
  type V1_ComputeSpecification,
  type V1_DatabricksTag,
  V1_DatabricksComputeSpecification,
  V1_SnowflakeComputeSpecification,
  V1_UnknownComputeSpecification,
} from '../../../../model/packageableElements/compute/V1_Compute.js';

const V1_buildSnowflakeComputeSpecification = (
  v1Spec: V1_SnowflakeComputeSpecification,
): SnowflakeComputeSpecification => {
  const spec = new SnowflakeComputeSpecification();
  spec.warehouseType = v1Spec.warehouseType;
  spec.warehouseSize = v1Spec.warehouseSize;
  spec.resourceConstraint = v1Spec.resourceConstraint;
  spec.maxClusterCount = v1Spec.maxClusterCount;
  spec.minClusterCount = v1Spec.minClusterCount;
  spec.scalingPolicy = v1Spec.scalingPolicy;
  spec.autoSuspend = v1Spec.autoSuspend;
  spec.autoResume = v1Spec.autoResume;
  spec.resourceMonitor = v1Spec.resourceMonitor;
  spec.comment = v1Spec.comment;
  spec.enableQueryAcceleration = v1Spec.enableQueryAcceleration;
  spec.queryAccelerationMaxScaleFactor = v1Spec.queryAccelerationMaxScaleFactor;
  return spec;
};

const V1_buildDatabricksTag = (v1Tag: V1_DatabricksTag): DatabricksTag => {
  const tag = new DatabricksTag();
  tag.key = v1Tag.key;
  tag.value = v1Tag.value;
  return tag;
};

const V1_buildDatabricksComputeSpecification = (
  v1Spec: V1_DatabricksComputeSpecification,
): DatabricksComputeSpecification => {
  const spec = new DatabricksComputeSpecification();
  spec.clusterSize = v1Spec.clusterSize;
  spec.autoStopMins = v1Spec.autoStopMins;
  spec.minNumClusters = v1Spec.minNumClusters;
  spec.maxNumClusters = v1Spec.maxNumClusters;
  spec.enablePhoton = v1Spec.enablePhoton;
  spec.spotInstancePolicy = v1Spec.spotInstancePolicy;
  spec.tags = v1Spec.tags.map(V1_buildDatabricksTag);
  return spec;
};

const V1_buildUnknownComputeSpecification = (
  v1Spec: V1_UnknownComputeSpecification,
): UnknownComputeSpecification => {
  const spec = new UnknownComputeSpecification();
  spec.content = v1Spec.content;
  return spec;
};

export const V1_buildComputeOwner = (
  v1Owner: V1_AppDirComputeOwner,
): AppDirComputeOwner => {
  const owner = new AppDirComputeOwner();
  if (v1Owner.production) {
    const production = new AppDirNode();
    production.appDirId = v1Owner.production.appDirId;
    production.level = v1Owner.production.level;
    owner.production = production;
  }
  if (v1Owner.prodParallel) {
    const prodParallel = new AppDirNode();
    prodParallel.appDirId = v1Owner.prodParallel.appDirId;
    prodParallel.level = v1Owner.prodParallel.level;
    owner.prodParallel = prodParallel;
  }
  return owner;
};

export const V1_buildComputeSpecification = (
  v1Spec: V1_ComputeSpecification,
): ComputeSpecification => {
  if (v1Spec instanceof V1_SnowflakeComputeSpecification) {
    return V1_buildSnowflakeComputeSpecification(v1Spec);
  } else if (v1Spec instanceof V1_DatabricksComputeSpecification) {
    return V1_buildDatabricksComputeSpecification(v1Spec);
  } else if (v1Spec instanceof V1_UnknownComputeSpecification) {
    return V1_buildUnknownComputeSpecification(v1Spec);
  }
  throw new UnsupportedOperationError(
    `Unsupported compute specification type`,
    v1Spec,
  );
};
