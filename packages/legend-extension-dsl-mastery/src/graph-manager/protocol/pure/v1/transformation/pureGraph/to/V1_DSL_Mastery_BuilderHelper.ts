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
  type PrecedenceRule,
  type RuleAction,
  ConditionalRule,
  CreateRule,
  DeleteRule,
  SourcePrecedenceRule,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_PrecedenceRule.js';
import {
  type V1_PrecedenceRule,
  type V1_ConditionalRule,
  type V1_CreateRule,
  type V1_DeleteRule,
  type V1_SourcePrecedenceRule,
  V1_RuleType,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_PrecedenceRule.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { PropertyPath } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_PropertyPath.js';
import type { V1_PropertyPath } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_PropertyPath.js';
import {
  type RuleScope,
  DataProviderIdScope,
  DataProviderTypeScope,
  RecordSourceScope,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_RuleScope.js';
import {
  type V1_DataProviderIdScope,
  type V1_DataProviderTypeScope,
  type V1_RecordSourceScope,
  type V1_RuleScope,
  V1_RuleScopeType,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_RuleScope.js';
import {
  type V1_GraphBuilderContext,
  V1_buildFullPath,
  V1_buildRawLambdaWithResolvedPaths,
} from '@finos/legend-graph';
import type { DataProviderType } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_DataProviderType.js';

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
 * precedence rule
 **********/
export const V1_buildPropertyPath = (
  element: V1_PropertyPath,
  context: V1_GraphBuilderContext,
): PropertyPath => {
  const propertyPath = new PropertyPath();
  propertyPath.property = element.property;
  propertyPath.filter = V1_buildRawLambdaWithResolvedPaths(
    element.filter.parameters,
    element.filter.body,
    context,
  );
  return propertyPath;
};

export const V1_buildDataProviderIdScope = (
  element: V1_DataProviderIdScope,
  context: V1_GraphBuilderContext,
): DataProviderIdScope => {
  const scope = new DataProviderIdScope();
  scope.dataProviderId = element.dataProviderId;
  return scope;
};

export const V1_buildRecordSourceScope = (
  element: V1_RecordSourceScope,
  context: V1_GraphBuilderContext,
): RecordSourceScope => {
  const scope = new RecordSourceScope();
  scope.recordSourceId = element.recordSourceId;
  return scope;
};

export const V1_buildDataProviderTypeScope = (
  element: V1_DataProviderTypeScope,
  context: V1_GraphBuilderContext,
): DataProviderTypeScope => {
  const scope = new DataProviderTypeScope();
  scope.dataProviderType =
    element.dataProviderType.valueOf() as DataProviderType;
  return scope;
};

export const V1_buildRuleScope = (
  element: V1_RuleScope,
  context: V1_GraphBuilderContext,
): RuleScope => {
  switch (element._type) {
    case V1_RuleScopeType.DATA_PROVIDER_ID_SCOPE:
      return V1_buildDataProviderIdScope(
        element as V1_DataProviderIdScope,
        context,
      );
    case V1_RuleScopeType.DATA_PROVIDER_TYPE_SCOPE:
      return V1_buildDataProviderTypeScope(
        element as V1_DataProviderTypeScope,
        context,
      );
    case V1_RuleScopeType.RECORD_SOURCE_SCOPE:
      return V1_buildRecordSourceScope(
        element as V1_RecordSourceScope,
        context,
      );
    default:
      throw new UnsupportedOperationError(
        `Unsupported rule scope '${element._type}'`,
      );
  }
};

export const V1_buildSourcePrecedenceRule = (
  element: V1_SourcePrecedenceRule,
  context: V1_GraphBuilderContext,
): SourcePrecedenceRule => {
  const sourcePrecedenceRule = new SourcePrecedenceRule();
  sourcePrecedenceRule.masterRecordFilter = V1_buildRawLambdaWithResolvedPaths(
    element.masterRecordFilter.parameters,
    element.masterRecordFilter.body,
    context,
  );
  sourcePrecedenceRule.precedence = element.precedence;
  sourcePrecedenceRule.action = element.action.valueOf() as RuleAction;
  sourcePrecedenceRule.paths = element.paths.map((path) =>
    V1_buildPropertyPath(path, context),
  );
  sourcePrecedenceRule.scopes = element.scopes.map((scope) =>
    V1_buildRuleScope(scope, context),
  );
  return sourcePrecedenceRule;
};

export const V1_buildConditionalRule = (
  element: V1_ConditionalRule,
  context: V1_GraphBuilderContext,
): ConditionalRule => {
  const conditionalRule = new ConditionalRule();
  conditionalRule.masterRecordFilter = V1_buildRawLambdaWithResolvedPaths(
    element.masterRecordFilter.parameters,
    element.masterRecordFilter.body,
    context,
  );
  conditionalRule.predicate = V1_buildRawLambdaWithResolvedPaths(
    element.predicate.parameters,
    element.predicate.body,
    context,
  );
  conditionalRule.paths = element.paths.map((path) =>
    V1_buildPropertyPath(path, context),
  );
  conditionalRule.scopes = element.scopes.map((scope) =>
    V1_buildRuleScope(scope, context),
  );
  return conditionalRule;
};

export const V1_buildDeleteRule = (
  element: V1_DeleteRule,
  context: V1_GraphBuilderContext,
): DeleteRule => {
  const deleteRule = new DeleteRule();
  deleteRule.masterRecordFilter = V1_buildRawLambdaWithResolvedPaths(
    element.masterRecordFilter.parameters,
    element.masterRecordFilter.body,
    context,
  );
  deleteRule.paths = element.paths.map((path) =>
    V1_buildPropertyPath(path, context),
  );
  deleteRule.scopes = element.scopes.map((scope) =>
    V1_buildRuleScope(scope, context),
  );
  return deleteRule;
};

export const V1_buildCreateRule = (
  element: V1_CreateRule,
  context: V1_GraphBuilderContext,
): CreateRule => {
  const createRule = new CreateRule();
  createRule.masterRecordFilter = V1_buildRawLambdaWithResolvedPaths(
    element.masterRecordFilter.parameters,
    element.masterRecordFilter.body,
    context,
  );
  createRule.paths = element.paths.map((path) =>
    V1_buildPropertyPath(path, context),
  );
  createRule.scopes = element.scopes.map((scope) =>
    V1_buildRuleScope(scope, context),
  );
  return createRule;
};

export const V1_buildPrecedenceRule = (
  element: V1_PrecedenceRule,
  context: V1_GraphBuilderContext,
): PrecedenceRule => {
  switch (element._type) {
    case V1_RuleType.CREATE_RULE:
      return V1_buildCreateRule(element as V1_CreateRule, context);
    case V1_RuleType.DELETE_RULE:
      return V1_buildDeleteRule(element as V1_DeleteRule, context);
    case V1_RuleType.CONDITIONAL_RULE:
      return V1_buildConditionalRule(element as V1_ConditionalRule, context);
    case V1_RuleType.SOURCE_PRECEDENCE_RULE:
      return V1_buildSourcePrecedenceRule(
        element as V1_SourcePrecedenceRule,
        context,
      );
    default:
      throw new UnsupportedOperationError(
        `Unsupported precedence rule '${element._type}'`,
      );
  }
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
  masterRecordDefinition.precedenceRules = protocol.precedenceRules?.map(
    (rule) => V1_buildPrecedenceRule(rule, context),
  );
  masterRecordDefinition.sources = protocol.sources.map((s) =>
    V1_buildRecordSource(s, context),
  );
};
