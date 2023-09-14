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
  type RecordSourceStatus,
  RecordService,
  RecordSource,
  RecordSourcePartition,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_RecordSource.js';
import type { V1_MasterRecordDefinition } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_MasterRecordDefinition.js';
import type {
  V1_IdentityResolution,
  V1_ResolutionQuery,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_IdentityResolution.js';
import type {
  V1_RecordService,
  V1_RecordSource,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_RecordSource.js';
import {
  getOwnDataProvider,
  getOwnFTPConnection,
  getOwnHTTPConnection,
  getOwnKafkaConnection,
  getOwnMasterRecordDefinition,
} from '../../../../../../DSL_Mastery_GraphManagerHelper.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { PropertyPath } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_PropertyPath.js';
import type { V1_PropertyPath } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_PropertyPath.js';
import type {
  DataProvider,
  DataProviderType,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_DataProvider.js';
import type {
  V1_KafkaConnection,
  V1_FTPConnection,
  V1_HTTPConnection,
  V1_ProxyConfiguration,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_Connection.js';
import {
  type FTPConnection,
  type HTTPConnection,
  type KafkaConnection,
  ProxyConfiguration,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Connection.js';
import {
  type V1_AcquisitionProtocol,
  V1_FileAcquisitionProtocol,
  V1_KafkaAcquisitionProtocol,
  V1_LegendServiceAcquisitionProtocol,
  V1_RestAcquisitionProtocol,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_AcquisitionProtocol.js';
import {
  type AcquisitionProtocol,
  type FileType,
  type KafkaDataType,
  FileAcquisitionProtocol,
  KafkaAcquisitionProtocol,
  LegendServiceAcquisitionProtocol,
  RestAcquisitionProtocol,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_AcquisitionProtocol.js';
import type { V1_DataProvider } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_DataProvider.js';
import {
  type Day,
  type Frequency,
  type Month,
  type Trigger,
  CronTrigger,
  ManualTrigger,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Trigger.js';
import {
  type V1_Trigger,
  V1_CronTrigger,
  V1_ManualTrigger,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_Trigger.js';
import type { DSL_Mastery_PureProtocolProcessorPlugin_Extension } from '../../../../DSL_Mastery_PureProtocolProcessorPlugin_Extension.js';
import type { V1_Authorization } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_Authorization.js';
import type { Authorization } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Authorization.js';
import {
  type V1_AuthenticationStrategy,
  type V1_CredentialSecret,
  V1_NTLMAuthenticationStrategy,
  V1_TokenAuthenticationStrategy,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_AuthenticationStrategy.js';
import {
  type AuthenticationStrategy,
  type CredentialSecret,
  NTLMAuthenticationStrategy,
  TokenAuthenticationStrategy,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_AuthenticationStrategy.js';
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
import type { V1_RecordSourcePartition } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_RecordSource.js';

/**********
 * data provider
 **********/

export const V1_buildDataProvider = (
  element: V1_DataProvider,
  context: V1_GraphBuilderContext,
): DataProvider => {
  const path = V1_buildFullPath(element.package, element.name);
  const dataProvider = getOwnDataProvider(path, context.currentSubGraph);
  dataProvider.dataProviderId = element.dataProviderId;
  dataProvider.dataProviderType =
    element.dataProviderType.valueOf() as DataProviderType;
  return dataProvider;
};

/**********
 * trigger
 **********/

export const V1_buildCronTrigger = (
  element: V1_CronTrigger,
  context: V1_GraphBuilderContext,
): CronTrigger => {
  const cronTrigger = new CronTrigger();
  cronTrigger.minute = element.minute;
  cronTrigger.hour = element.hour;
  cronTrigger.days = element.days?.valueOf() as Day[];
  cronTrigger.month = element.month?.valueOf() as Month;
  cronTrigger.dayOfMonth = element.dayOfMonth;
  cronTrigger.timeZone = element.timeZone;
  cronTrigger.frequency = element.frequency?.valueOf() as Frequency;
  return cronTrigger;
};

export const V1_buildTrigger = (
  element: V1_Trigger,
  context: V1_GraphBuilderContext,
): Trigger => {
  if (element instanceof V1_ManualTrigger) {
    return new ManualTrigger();
  } else if (element instanceof V1_CronTrigger) {
    return V1_buildCronTrigger(element, context);
  }
  throw new UnsupportedOperationError(
    `Can't build trigger '${typeof element}'`,
  );
};

/**********
 * credential secret
 **********/

export const V1_buildCredentialSecret = (
  element: V1_CredentialSecret,
  context: V1_GraphBuilderContext,
): CredentialSecret => {
  const extraCredentialSecretBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraCredentialSecretBuilders?.() ?? [],
  );
  for (const builder of extraCredentialSecretBuilders) {
    const metamodel = builder(element, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build credential secret '${typeof element}'`,
  );
};

/**********
 * authentication strategy
 **********/

export const V1_buildNTLMAuthenticationStrategy = (
  element: V1_NTLMAuthenticationStrategy,
  context: V1_GraphBuilderContext,
): NTLMAuthenticationStrategy => {
  const ntlmAuthenticationStrategy = new NTLMAuthenticationStrategy();
  ntlmAuthenticationStrategy.credential = element.credential
    ? V1_buildCredentialSecret(element.credential, context)
    : undefined;
  return ntlmAuthenticationStrategy;
};

export const V1_buildTokenAuthenticationStrategy = (
  element: V1_TokenAuthenticationStrategy,
  context: V1_GraphBuilderContext,
): TokenAuthenticationStrategy => {
  const tokenAuthenticationStrategy = new TokenAuthenticationStrategy();
  tokenAuthenticationStrategy.credential = element.credential
    ? V1_buildCredentialSecret(element.credential, context)
    : undefined;
  tokenAuthenticationStrategy.tokenUrl = element.tokenUrl;
  return tokenAuthenticationStrategy;
};

export const V1_buildAuthenticationStrategy = (
  element: V1_AuthenticationStrategy,
  context: V1_GraphBuilderContext,
): AuthenticationStrategy => {
  if (element instanceof V1_NTLMAuthenticationStrategy) {
    return V1_buildNTLMAuthenticationStrategy(element, context);
  } else if (element instanceof V1_TokenAuthenticationStrategy) {
    return V1_buildTokenAuthenticationStrategy(element, context);
  }
  const extraAuthenticationStrategyBuilders =
    context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraAuthenticationStrategyBuilders?.() ?? [],
    );
  for (const builder of extraAuthenticationStrategyBuilders) {
    const metamodel = builder(element, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build authentication strategy '${typeof element}'`,
  );
};

/**********
 * connection
 **********/

export const V1_buildProxyConfiguration = (
  element: V1_ProxyConfiguration,
  context: V1_GraphBuilderContext,
): ProxyConfiguration => {
  const proxyConfiguration = new ProxyConfiguration();
  proxyConfiguration.authentication = element.authentication
    ? V1_buildAuthenticationStrategy(element.authentication, context)
    : undefined;
  proxyConfiguration.host = element.host;
  proxyConfiguration.port = element.port;
  return proxyConfiguration;
};

export const V1_buildFTPConnection = (
  element: V1_FTPConnection,
  context: V1_GraphBuilderContext,
): FTPConnection => {
  const path = V1_buildFullPath(element.package, element.name);
  const ftpConnection = getOwnFTPConnection(path, context.currentSubGraph);
  ftpConnection.authentication = element.authentication
    ? V1_buildAuthenticationStrategy(element.authentication, context)
    : undefined;
  ftpConnection.host = element.host;
  ftpConnection.port = element.port;
  ftpConnection.secure = element.secure;
  return ftpConnection;
};

export const V1_buildHTTPConnection = (
  element: V1_HTTPConnection,
  context: V1_GraphBuilderContext,
): HTTPConnection => {
  const path = V1_buildFullPath(element.package, element.name);
  const httpConnection = getOwnHTTPConnection(path, context.currentSubGraph);
  httpConnection.authentication = element.authentication
    ? V1_buildAuthenticationStrategy(element.authentication, context)
    : undefined;
  httpConnection.proxy = element.proxy
    ? V1_buildProxyConfiguration(element.proxy, context)
    : undefined;
  httpConnection.url = element.url;
  return httpConnection;
};

export const V1_buildKafkaConnection = (
  element: V1_KafkaConnection,
  context: V1_GraphBuilderContext,
): KafkaConnection => {
  const path = V1_buildFullPath(element.package, element.name);
  const kafkaConnection = getOwnKafkaConnection(path, context.currentSubGraph);
  kafkaConnection.authentication = element.authentication
    ? V1_buildAuthenticationStrategy(element.authentication, context)
    : undefined;
  kafkaConnection.topicName = element.topicName;
  kafkaConnection.topicUrls = element.topicUrls;
  return kafkaConnection;
};

/**********
 * acquisition protocol
 **********/

export const V1_buildLegendServiceAcquisitionProtocol = (
  element: V1_LegendServiceAcquisitionProtocol,
  context: V1_GraphBuilderContext,
): LegendServiceAcquisitionProtocol => {
  const legendServiceAcquisitionProtocol =
    new LegendServiceAcquisitionProtocol();
  legendServiceAcquisitionProtocol.service = element.service;
  return legendServiceAcquisitionProtocol;
};

export const V1_buildFileAcquisitionProtocol = (
  element: V1_FileAcquisitionProtocol,
  context: V1_GraphBuilderContext,
): FileAcquisitionProtocol => {
  const fileAcquisitionProtocol = new FileAcquisitionProtocol();
  fileAcquisitionProtocol.connection = element.connection;
  fileAcquisitionProtocol.filePath = element.filePath;
  fileAcquisitionProtocol.fileType = element.fileType.valueOf() as FileType;
  fileAcquisitionProtocol.fileSplittingKeys = element.fileSplittingKeys;
  fileAcquisitionProtocol.headerLines = element.headerLines;
  fileAcquisitionProtocol.recordsKey = element.recordsKey;
  return fileAcquisitionProtocol;
};

export const V1_buildKafkaAcquisitionProtocol = (
  element: V1_KafkaAcquisitionProtocol,
  context: V1_GraphBuilderContext,
): KafkaAcquisitionProtocol => {
  const kafkaAcquisitionProtocol = new KafkaAcquisitionProtocol();
  kafkaAcquisitionProtocol.connection = element.connection;
  kafkaAcquisitionProtocol.kafkaDataType =
    element.kafkaDataType.valueOf() as KafkaDataType;
  kafkaAcquisitionProtocol.recordTag = element.recordTag;
  return kafkaAcquisitionProtocol;
};

export const V1_buildRestAcquisitionProtocol = (
  element: V1_RestAcquisitionProtocol,
  context: V1_GraphBuilderContext,
): RestAcquisitionProtocol => new RestAcquisitionProtocol();

export const V1_buildAcquisitionProtocol = (
  element: V1_AcquisitionProtocol,
  context: V1_GraphBuilderContext,
): AcquisitionProtocol => {
  if (element instanceof V1_LegendServiceAcquisitionProtocol) {
    return V1_buildLegendServiceAcquisitionProtocol(element, context);
  } else if (element instanceof V1_FileAcquisitionProtocol) {
    return V1_buildFileAcquisitionProtocol(element, context);
  } else if (element instanceof V1_KafkaAcquisitionProtocol) {
    return V1_buildKafkaAcquisitionProtocol(element, context);
  } else if (element instanceof V1_RestAcquisitionProtocol) {
    return V1_buildRestAcquisitionProtocol(element, context);
  }
  const extraAcquisitionProtocolBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAcquisitionProtocolBuilders?.() ?? [],
  );
  for (const builder of extraAcquisitionProtocolBuilders) {
    const metamodel = builder(element, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build acquisition protocol '${typeof element}'`,
  );
};

/**********
 * authorization
 **********/

export const V1_buildAuthorization = (
  element: V1_Authorization,
  context: V1_GraphBuilderContext,
): Authorization => {
  const extraAuthorizationBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAuthorizationBuilders?.() ?? [],
  );
  for (const builder of extraAuthorizationBuilders) {
    const metamodel = builder(element, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build authorization '${typeof element}'`,
  );
};

/**********
 * sources
 **********/

export const V1_buildRecordService = (
  protocol: V1_RecordService,
  context: V1_GraphBuilderContext,
): RecordService => {
  const recordService = new RecordService();
  recordService.parseService = protocol.parseService;
  recordService.transformService = protocol.transformService;
  recordService.acquisitionProtocol = protocol.acquisitionProtocol
    ? V1_buildAcquisitionProtocol(protocol.acquisitionProtocol, context)
    : undefined;
  return recordService;
};

export const V1_buildRecordSourcePartition = (
  protocol: V1_RecordSourcePartition,
  context: V1_GraphBuilderContext,
): RecordSourcePartition => {
  const recordSourcePartition = new RecordSourcePartition();
  recordSourcePartition.id = protocol.id;
  return recordSourcePartition;
};

export const V1_buildRecordSource = (
  protocol: V1_RecordSource,
  context: V1_GraphBuilderContext,
): RecordSource => {
  const recordSource = new RecordSource();
  recordSource.id = protocol.id;
  recordSource.status = protocol.status.valueOf() as RecordSourceStatus;
  recordSource.description = protocol.description;
  recordSource.sequentialData = protocol.sequentialData;
  recordSource.stagedLoad = protocol.stagedLoad;
  recordSource.createPermitted = protocol.createPermitted;
  recordSource.createBlockedException = protocol.createBlockedException;
  recordSource.allowFieldDelete = protocol.allowFieldDelete;
  recordSource.recordService = protocol.recordService
    ? V1_buildRecordService(protocol.recordService, context)
    : undefined;
  recordSource.trigger = protocol.trigger
    ? V1_buildTrigger(protocol.trigger, context)
    : undefined;
  recordSource.authorization = protocol.authorization
    ? V1_buildAuthorization(protocol.authorization, context)
    : undefined;
  recordSource.dataProvider = protocol.dataProvider;
  recordSource.partitions = protocol.partitions
    ? protocol.partitions.map((p) => V1_buildRecordSourcePartition(p, context))
    : undefined;
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
        `Can't build rule scope '${element._type}'`,
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
        `Can't build precedence rule '${element._type}'`,
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
  masterRecordDefinition.postCurationEnrichmentService =
    protocol.postCurationEnrichmentService;
};
