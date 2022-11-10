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
  IdentityResolution,
  ResolutionQuery,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_IdentityResolution.js';
import {
  RecordSource,
  RecordSourcePartition,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_RecordSource.js';
import type { V1_MasterRecordDefinition } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_MasterRecordDefinition.js';
import type {
  V1_IdentityResolution,
  V1_ResolutionQuery,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_IdentityResolution.js';
import type {
  V1_RecordSource,
  V1_RecordSourcePartition,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_RecordSource.js';
import { getOwnMasterRecordDefinition } from '../../../../../../DSL_Mastery_GraphManagerHelper.js';
import {
  type V1_GraphBuilderContext,
  V1_buildFullPath,
  V1_buildRawLambdaWithResolvedPaths,
} from '@finos/legend-graph';

/**********
 * sources
 **********/

export const V1_buildRecordSourcePartition = (
  protocol: V1_RecordSourcePartition,
  context: V1_GraphBuilderContext,
): RecordSourcePartition => {
  const recordSourcePartition = new RecordSourcePartition();
  recordSourcePartition.id = protocol.id;
  recordSourcePartition.tags = protocol.tags;
  return recordSourcePartition;
};

export const V1_buildRecordSource = (
  protocol: V1_RecordSource,
  context: V1_GraphBuilderContext,
): RecordSource => {
  const recordSource = new RecordSource();
  recordSource.id = protocol.id;
  recordSource.status = protocol.status;
  recordSource.description = protocol.description;
  recordSource.partitions = protocol.partitions.map((p) =>
    V1_buildRecordSourcePartition(p, context),
  );
  recordSource.parseService = protocol.parseService;
  recordSource.transformService = protocol.transformService;
  recordSource.sequentialData = protocol.sequentialData;
  recordSource.stagedLoad = protocol.stagedLoad;
  recordSource.createPermitted = protocol.createPermitted;
  recordSource.createBlockedException = protocol.createBlockedException;
  recordSource.tags = protocol.tags;
  return recordSource;
};

/**********
 * identity resolution
 **********/

export const V1_buildResolutionQuery = (
  protocol: V1_ResolutionQuery,
  context: V1_GraphBuilderContext,
): ResolutionQuery => {
  const resolutionQuery = new ResolutionQuery();
  resolutionQuery.keyType = protocol.keyType;
  resolutionQuery.precedence = protocol.precedence;
  resolutionQuery.queries = protocol.queries.map((rq) =>
    V1_buildRawLambdaWithResolvedPaths(rq.parameters, rq.body, context),
  );
  return resolutionQuery;
};

export const V1_buildIdentityResolution = (
  protocol: V1_IdentityResolution,
  context: V1_GraphBuilderContext,
): IdentityResolution => {
  const identityResolution = new IdentityResolution();
  identityResolution.modelClass = protocol.modelClass;
  identityResolution.resolutionQueries = protocol.resolutionQueries.map((q) =>
    V1_buildResolutionQuery(q, context),
  );
  return identityResolution;
};

/**********
 * master record definition
 **********/

export const V1_buildMasterRecordDefinition = (
  protocol: V1_MasterRecordDefinition,
  context: V1_GraphBuilderContext,
): void => {
  const path = V1_buildFullPath(protocol.package, protocol.name);
  const masterRecordDefinition = getOwnMasterRecordDefinition(
    path,
    context.currentSubGraph,
  );
  masterRecordDefinition.modelClass = protocol.modelClass;
  masterRecordDefinition.identityResolution = V1_buildIdentityResolution(
    protocol.identityResolution,
    context,
  );
  masterRecordDefinition.sources = protocol.sources.map((s) =>
    V1_buildRecordSource(s, context),
  );
};
