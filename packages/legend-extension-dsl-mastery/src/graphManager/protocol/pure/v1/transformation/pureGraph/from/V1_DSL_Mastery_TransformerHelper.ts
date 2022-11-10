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

import type { MasterRecordDefinition } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import type {
  IdentityResolution,
  ResolutionQuery,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_IdentityResolution.js';
import type {
  RecordSource,
  RecordSourcePartition,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_RecordSource.js';
import { V1_MasterRecordDefinition } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_MasterRecordDefinition.js';
import {
  V1_IdentityResolution,
  V1_ResolutionQuery,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_IdentityResolution.js';
import {
  V1_RecordSource,
  V1_RecordSourcePartition,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_RecordSource.js';
import {
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  V1_RawLambda,
} from '@finos/legend-graph';

/**********
 * sources
 **********/

export const V1_transformRecordSourcePartition = (
  element: RecordSourcePartition,
  context: V1_GraphTransformerContext,
): V1_RecordSourcePartition => {
  const recordSourcePartition = new V1_RecordSourcePartition();
  recordSourcePartition.id = element.id;
  recordSourcePartition.tags = element.tags;
  return recordSourcePartition;
};

export const V1_transformRecordSource = (
  element: RecordSource,
  context: V1_GraphTransformerContext,
): V1_RecordSource => {
  const recordSource = new V1_RecordSource();
  recordSource.id = element.id;
  recordSource.status = element.status;
  recordSource.description = element.description;
  recordSource.partitions = element.partitions.map((p) =>
    V1_transformRecordSourcePartition(p, context),
  );
  recordSource.parseService = element.parseService;
  recordSource.transformService = element.transformService;
  recordSource.sequentialData = element.sequentialData;
  recordSource.stagedLoad = element.stagedLoad;
  recordSource.createPermitted = element.createPermitted;
  recordSource.createBlockedException = element.createBlockedException;
  recordSource.tags = element.tags;
  return recordSource;
};

/**********
 * identity resolution
 **********/

export const V1_transformResolutionQuery = (
  element: ResolutionQuery,
  context: V1_GraphTransformerContext,
): V1_ResolutionQuery => {
  const resolutionQuery = new V1_ResolutionQuery();
  resolutionQuery.keyType = element.keyType;
  resolutionQuery.precedence = element.precedence;
  resolutionQuery.queries = element.queries.map((rq) => {
    const lambda = new V1_RawLambda();
    lambda.parameters = rq.parameters;
    lambda.body = rq.body;
    return lambda;
  });
  return resolutionQuery;
};

export const V1_transformIdentityResolution = (
  element: IdentityResolution,
  context: V1_GraphTransformerContext,
): V1_IdentityResolution => {
  const identityResolution = new V1_IdentityResolution();
  identityResolution.modelClass = element.modelClass;
  identityResolution.resolutionQueries = element.resolutionQueries.map((q) =>
    V1_transformResolutionQuery(q, context),
  );
  return identityResolution;
};

/**********
 * master record definition
 **********/

export const V1_transformMasterRecordDefinition = (
  element: MasterRecordDefinition,
  context: V1_GraphTransformerContext,
): V1_MasterRecordDefinition => {
  const protocol = new V1_MasterRecordDefinition();
  V1_initPackageableElement(protocol, element);
  protocol.modelClass = element.modelClass;
  protocol.identityResolution = V1_transformIdentityResolution(
    element.identityResolution,
    context,
  );
  protocol.sources = element.sources.map((s) =>
    V1_transformRecordSource(s, context),
  );
  return protocol;
};
