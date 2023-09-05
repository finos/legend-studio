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
  type V1_PrecedenceRule,
  type V1_RuleAction,
  V1_ConditionalRule,
  V1_CreateRule,
  V1_DeleteRule,
  V1_RuleType,
  V1_SourcePrecedenceRule,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_PrecedenceRule.js';
import {
  type PrecedenceRule,
  ConditionalRule,
  CreateRule,
  DeleteRule,
  SourcePrecedenceRule,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_PrecedenceRule.js';
import { V1_PropertyPath } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_PropertyPath.js';
import type { PropertyPath } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_PropertyPath.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type RuleScope,
  DataProviderIdScope,
  DataProviderTypeScope,
  RecordSourceScope,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_RuleScope.js';
import {
  type V1_RuleScope,
  V1_DataProviderIdScope,
  V1_DataProviderTypeScope,
  V1_RecordSourceScope,
  V1_RuleScopeType,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_RuleScope.js';
import type { V1_DataProviderType } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_DataProviderType.js';
import {
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  V1_RawLambda,
  V1_transformRawLambda,
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
 * precedence rule
 **********/
export const V1_transformPropertyPath = (
  element: PropertyPath,
  context: V1_GraphTransformerContext,
): V1_PropertyPath => {
  const propertyPath = new V1_PropertyPath();
  propertyPath.property = element.property;
  propertyPath.filter = V1_transformRawLambda(element.filter, context);
  return propertyPath;
};

export const V1_transformDataProviderIdScope = (
  element: DataProviderIdScope,
  context: V1_GraphTransformerContext,
): V1_DataProviderIdScope => {
  const scope = new V1_DataProviderIdScope();
  scope._type = V1_RuleScopeType.DATA_PROVIDER_ID_SCOPE;
  scope.dataProviderId = element.dataProviderId;
  return scope;
};

export const V1_transformRecordSourceScope = (
  element: RecordSourceScope,
  context: V1_GraphTransformerContext,
): V1_RecordSourceScope => {
  const scope = new V1_RecordSourceScope();
  scope._type = V1_RuleScopeType.RECORD_SOURCE_SCOPE;
  scope.recordSourceId = element.recordSourceId;
  return scope;
};

export const V1_transformDataProviderTypeScope = (
  element: DataProviderTypeScope,
  context: V1_GraphTransformerContext,
): V1_DataProviderTypeScope => {
  const scope = new V1_DataProviderTypeScope();
  scope._type = V1_RuleScopeType.DATA_PROVIDER_TYPE_SCOPE;
  scope.dataProviderType =
    element.dataProviderType.valueOf() as V1_DataProviderType;
  return scope;
};

export const V1_transformRuleScope = (
  element: RuleScope,
  context: V1_GraphTransformerContext,
): V1_RuleScope => {
  switch (element.constructor) {
    case DataProviderIdScope:
      return V1_transformDataProviderIdScope(
        element as DataProviderIdScope,
        context,
      );
    case DataProviderTypeScope:
      return V1_transformDataProviderTypeScope(
        element as DataProviderTypeScope,
        context,
      );
    case RecordSourceScope:
      return V1_transformRecordSourceScope(
        element as RecordSourceScope,
        context,
      );
    default:
      throw new UnsupportedOperationError(
        `Unsupported rule scope '${typeof element}'`,
      );
  }
};

export const V1_transformSourcePrecedenceRule = (
  element: SourcePrecedenceRule,
  context: V1_GraphTransformerContext,
): V1_SourcePrecedenceRule => {
  const sourcePrecedenceRule = new V1_SourcePrecedenceRule();
  sourcePrecedenceRule._type = V1_RuleType.SOURCE_PRECEDENCE_RULE;
  sourcePrecedenceRule.precedence = element.precedence;
  sourcePrecedenceRule.masterRecordFilter = V1_transformRawLambda(
    element.masterRecordFilter,
    context,
  );
  sourcePrecedenceRule.action = element.action.valueOf() as V1_RuleAction;
  sourcePrecedenceRule.paths = element.paths.map((path) =>
    V1_transformPropertyPath(path, context),
  );
  sourcePrecedenceRule.scopes = element.scopes.map((scope) =>
    V1_transformRuleScope(scope, context),
  );
  return sourcePrecedenceRule;
};

export const V1_transformConditionalRule = (
  element: ConditionalRule,
  context: V1_GraphTransformerContext,
): V1_ConditionalRule => {
  const conditionalRule = new V1_ConditionalRule();
  conditionalRule._type = V1_RuleType.CONDITIONAL_RULE;
  conditionalRule.masterRecordFilter = V1_transformRawLambda(
    element.masterRecordFilter,
    context,
  );
  conditionalRule.predicate = V1_transformRawLambda(element.predicate, context);
  conditionalRule.paths = element.paths.map((path) =>
    V1_transformPropertyPath(path, context),
  );
  conditionalRule.scopes = element.scopes.map((scope) =>
    V1_transformRuleScope(scope, context),
  );
  return conditionalRule;
};

export const V1_transformDeleteRule = (
  element: DeleteRule,
  context: V1_GraphTransformerContext,
): V1_DeleteRule => {
  const deleteRule = new V1_DeleteRule();
  deleteRule._type = V1_RuleType.DELETE_RULE;
  deleteRule.masterRecordFilter = V1_transformRawLambda(
    element.masterRecordFilter,
    context,
  );
  deleteRule.paths = element.paths.map((path) =>
    V1_transformPropertyPath(path, context),
  );
  deleteRule.scopes = element.scopes.map((scope) =>
    V1_transformRuleScope(scope, context),
  );
  return deleteRule;
};

export const V1_transformCreateRule = (
  element: CreateRule,
  context: V1_GraphTransformerContext,
): V1_CreateRule => {
  const createRule = new V1_CreateRule();
  createRule._type = V1_RuleType.CREATE_RULE;
  createRule.masterRecordFilter = V1_transformRawLambda(
    element.masterRecordFilter,
    context,
  );
  createRule.paths = element.paths.map((path) =>
    V1_transformPropertyPath(path, context),
  );
  createRule.scopes = element.scopes.map((scope) =>
    V1_transformRuleScope(scope, context),
  );
  return createRule;
};

export const V1_transformPrecedenceRule = (
  element: PrecedenceRule,
  context: V1_GraphTransformerContext,
): V1_PrecedenceRule => {
  switch (element.constructor) {
    case CreateRule:
      return V1_transformCreateRule(element, context);
    case DeleteRule:
      return V1_transformDeleteRule(element, context);
    case ConditionalRule:
      return V1_transformConditionalRule(element as ConditionalRule, context);
    case SourcePrecedenceRule:
      return V1_transformSourcePrecedenceRule(
        element as SourcePrecedenceRule,
        context,
      );
    default:
      throw new UnsupportedOperationError(
        `Unsupported precedence rule '${typeof element}'`,
      );
  }
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
  protocol.precedenceRules = element.precedenceRules?.map((rule) =>
    V1_transformPrecedenceRule(rule, context),
  );
  protocol.sources = element.sources.map((s) =>
    V1_transformRecordSource(s, context),
  );
  return protocol;
};
