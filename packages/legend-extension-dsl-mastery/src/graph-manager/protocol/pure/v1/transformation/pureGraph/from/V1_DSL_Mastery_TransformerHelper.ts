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
  RecordService,
  RecordSource,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_RecordSource.js';
import { V1_MasterRecordDefinition } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_MasterRecordDefinition.js';
import {
  V1_IdentityResolution,
  V1_ResolutionQuery,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_IdentityResolution.js';
import {
  type V1_RecordSourceStatus,
  V1_RecordService,
  V1_RecordSource,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_RecordSource.js';
import { V1_PropertyPath } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_PropertyPath.js';
import type { PropertyPath } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_PropertyPath.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type V1_DataProviderType,
  V1_DataProvider,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_DataProvider.js';
import {
  type V1_AcquisitionProtocol,
  type V1_FileType,
  type V1_KafkaDataType,
  V1_FileAcquisitionProtocol,
  V1_KafkaAcquisitionProtocol,
  V1_LegendServiceAcquisitionProtocol,
  V1_RestAcquisitionProtocol,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_AcquisitionProtocol.js';
import {
  type AcquisitionProtocol,
  FileAcquisitionProtocol,
  KafkaAcquisitionProtocol,
  LegendServiceAcquisitionProtocol,
  RestAcquisitionProtocol,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_AcquisitionProtocol.js';
import type {
  KafkaConnection,
  FTPConnection,
  HTTPConnection,
  ProxyConfiguration,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Connection.js';
import {
  V1_FTPConnection,
  V1_HTTPConnection,
  V1_KafkaConnection,
  V1_ProxyConfiguration,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_Connection.js';
import type { DataProvider } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_DataProvider.js';
import {
  type Trigger,
  CronTrigger,
  ManualTrigger,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Trigger.js';
import {
  type V1_Day,
  type V1_Frequency,
  type V1_Month,
  type V1_Trigger,
  V1_CronTrigger,
  V1_ManualTrigger,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_Trigger.js';
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
import {
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  V1_RawLambda,
  V1_transformRawLambda,
} from '@finos/legend-graph';
import type { DSL_Mastery_PureProtocolProcessorPlugin_Extension } from '../../../../DSL_Mastery_PureProtocolProcessorPlugin_Extension.js';
import type { Authorization } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Authorization.js';
import type { V1_Authorization } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_Authorization.js';
import {
  type AuthenticationStrategy,
  type CredentialSecret,
  NTLMAuthenticationStrategy,
  TokenAuthenticationStrategy,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_AuthenticationStrategy.js';
import {
  type V1_AuthenticationStrategy,
  type V1_CredentialSecret,
  V1_NTLMAuthenticationStrategy,
  V1_TokenAuthenticationStrategy,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_AuthenticationStrategy.js';

/**********
 * data provider
 **********/

export const V1_transformDataProvider = (
  element: DataProvider,
  context: V1_GraphTransformerContext,
): V1_DataProvider => {
  const dataProvider = new V1_DataProvider();
  V1_initPackageableElement(dataProvider, element);
  dataProvider.dataProviderId = element.dataProviderId;
  dataProvider.dataProviderType =
    element.dataProviderType.valueOf() as V1_DataProviderType;
  return dataProvider;
};

/**********
 * trigger
 **********/

export const V1_transformCronTrigger = (
  element: CronTrigger,
  context: V1_GraphTransformerContext,
): V1_CronTrigger => {
  const cronTrigger = new V1_CronTrigger();
  cronTrigger.minute = element.minute;
  cronTrigger.hour = element.hour;
  cronTrigger.days = element.days?.valueOf() as V1_Day[];
  cronTrigger.month = element.month?.valueOf() as V1_Month;
  cronTrigger.dayOfMonth = element.dayOfMonth;
  cronTrigger.timeZone = element.timeZone;
  cronTrigger.frequency = element.frequency?.valueOf() as V1_Frequency;
  return cronTrigger;
};

export const V1_transformTrigger = (
  element: Trigger,
  context: V1_GraphTransformerContext,
): V1_Trigger => {
  switch (element.constructor) {
    case ManualTrigger:
      return new V1_ManualTrigger();
    case CronTrigger:
      return V1_transformCronTrigger(element as CronTrigger, context);
    default:
      throw new UnsupportedOperationError(
        `Unsupported trigger '${typeof element}'`,
      );
  }
};

/**********
 * credential secret
 **********/

export const V1_transformCredentialSecret = (
  element: CredentialSecret | undefined,
  context: V1_GraphTransformerContext,
): V1_CredentialSecret | undefined => {
  if (element === undefined) {
    return element;
  }
  const extraCredentialSecretTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraCredentialSecretTransformers?.() ?? [],
  );
  for (const transformer of extraCredentialSecretTransformers) {
    const protocol = transformer(element, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Unsupported credential secret '${typeof element}'`,
  );
};

/**********
 * authentication strategy
 **********/

export const V1_transformNTLMAuthenticationStrategy = (
  element: NTLMAuthenticationStrategy,
  context: V1_GraphTransformerContext,
): V1_NTLMAuthenticationStrategy => {
  const ntlmAuthenticationStrategy = new V1_NTLMAuthenticationStrategy();
  ntlmAuthenticationStrategy.credential = V1_transformCredentialSecret(
    element.credential,
    context,
  );
  return ntlmAuthenticationStrategy;
};

export const V1_transformTokenAuthenticationStrategy = (
  element: TokenAuthenticationStrategy,
  context: V1_GraphTransformerContext,
): V1_TokenAuthenticationStrategy => {
  const tokenAuthenticationStrategy = new V1_TokenAuthenticationStrategy();
  tokenAuthenticationStrategy.credential = V1_transformCredentialSecret(
    element.credential,
    context,
  );
  tokenAuthenticationStrategy.tokenUrl = element.tokenUrl;
  return tokenAuthenticationStrategy;
};

export const V1_transformAuthenticationStrategy = (
  element: AuthenticationStrategy | undefined,
  context: V1_GraphTransformerContext,
): V1_AuthenticationStrategy | undefined => {
  if (element === undefined) {
    return element;
  }
  switch (element.constructor) {
    case NTLMAuthenticationStrategy:
      return V1_transformNTLMAuthenticationStrategy(
        element as NTLMAuthenticationStrategy,
        context,
      );
    case TokenAuthenticationStrategy:
      return V1_transformTokenAuthenticationStrategy(
        element as TokenAuthenticationStrategy,
        context,
      );
    default: {
      const extraAuthenticationStrategyTransformers = context.plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraAuthenticationStrategyTransformers?.() ?? [],
      );
      for (const transformer of extraAuthenticationStrategyTransformers) {
        const protocol = transformer(element, context);
        if (protocol) {
          return protocol;
        }
      }
      throw new UnsupportedOperationError(
        `Unsupported authentication strategy '${typeof element}'`,
      );
    }
  }
};

/**********
 * connection
 **********/

export const V1_transformProxyConfiguration = (
  element: ProxyConfiguration,
  context: V1_GraphTransformerContext,
): V1_ProxyConfiguration => {
  const proxyConfiguration = new V1_ProxyConfiguration();
  proxyConfiguration.authentication = V1_transformAuthenticationStrategy(
    element.authentication,
    context,
  );
  proxyConfiguration.host = element.host;
  proxyConfiguration.port = element.port;
  return proxyConfiguration;
};

export const V1_transformFTPConnection = (
  element: FTPConnection,
  context: V1_GraphTransformerContext,
): V1_FTPConnection => {
  const ftpConnection = new V1_FTPConnection();
  V1_initPackageableElement(ftpConnection, element);
  ftpConnection.authentication = V1_transformAuthenticationStrategy(
    element.authentication,
    context,
  );
  ftpConnection.host = element.host;
  ftpConnection.port = element.port;
  ftpConnection.secure = element.secure;
  return ftpConnection;
};

export const V1_transformHTTPConnection = (
  element: HTTPConnection,
  context: V1_GraphTransformerContext,
): V1_HTTPConnection => {
  const httpConnection = new V1_HTTPConnection();
  V1_initPackageableElement(httpConnection, element);
  httpConnection.authentication = V1_transformAuthenticationStrategy(
    element.authentication,
    context,
  );
  httpConnection.proxy = element.proxy
    ? V1_transformProxyConfiguration(element.proxy, context)
    : undefined;
  httpConnection.url = element.url;
  return httpConnection;
};

export const V1_transformKafkaConnection = (
  element: KafkaConnection,
  context: V1_GraphTransformerContext,
): V1_KafkaConnection => {
  const kafkaConnection = new V1_KafkaConnection();
  V1_initPackageableElement(kafkaConnection, element);
  kafkaConnection.authentication = V1_transformAuthenticationStrategy(
    element.authentication,
    context,
  );
  kafkaConnection.topicName = element.topicName;
  kafkaConnection.topicUrls = element.topicUrls;
  return kafkaConnection;
};

/**********
 * acquisition protocol
 **********/

export const V1_transformLegendServiceAcquisitionProtocol = (
  element: LegendServiceAcquisitionProtocol,
  context: V1_GraphTransformerContext,
): V1_LegendServiceAcquisitionProtocol => {
  const legendServiceAcquisitionProtocol =
    new V1_LegendServiceAcquisitionProtocol();
  legendServiceAcquisitionProtocol.service = element.service;
  return legendServiceAcquisitionProtocol;
};

export const V1_transformFileAcquisitionProtocol = (
  element: FileAcquisitionProtocol,
  context: V1_GraphTransformerContext,
): V1_FileAcquisitionProtocol => {
  const fileAcquisitionProtocol = new V1_FileAcquisitionProtocol();
  fileAcquisitionProtocol.connection = element.connection;
  fileAcquisitionProtocol.filePath = element.filePath;
  fileAcquisitionProtocol.fileType = element.fileType.valueOf() as V1_FileType;
  fileAcquisitionProtocol.fileSplittingKeys = element.fileSplittingKeys;
  fileAcquisitionProtocol.headerLines = element.headerLines;
  fileAcquisitionProtocol.recordsKey = element.recordsKey;
  return fileAcquisitionProtocol;
};

export const V1_transformKafkaAcquisitionProtocol = (
  element: KafkaAcquisitionProtocol,
  context: V1_GraphTransformerContext,
): V1_KafkaAcquisitionProtocol => {
  const kafkaAcquisitionProtocol = new V1_KafkaAcquisitionProtocol();
  kafkaAcquisitionProtocol.connection = element.connection;
  kafkaAcquisitionProtocol.kafkaDataType =
    element.kafkaDataType.valueOf() as V1_KafkaDataType;
  kafkaAcquisitionProtocol.recordTag = element.recordTag;
  return kafkaAcquisitionProtocol;
};

export const V1_transformRestAcquisitionProtocol = (
  element: RestAcquisitionProtocol,
  context: V1_GraphTransformerContext,
): V1_RestAcquisitionProtocol => new V1_RestAcquisitionProtocol();

export const V1_transformAcquisitionProtocol = (
  element: AcquisitionProtocol,
  context: V1_GraphTransformerContext,
): V1_AcquisitionProtocol => {
  switch (element.constructor) {
    case LegendServiceAcquisitionProtocol:
      return V1_transformLegendServiceAcquisitionProtocol(
        element as LegendServiceAcquisitionProtocol,
        context,
      );
    case FileAcquisitionProtocol:
      return V1_transformFileAcquisitionProtocol(
        element as FileAcquisitionProtocol,
        context,
      );
    case KafkaAcquisitionProtocol:
      return V1_transformKafkaAcquisitionProtocol(
        element as KafkaAcquisitionProtocol,
        context,
      );
    case RestAcquisitionProtocol:
      return V1_transformRestAcquisitionProtocol(
        element as RestAcquisitionProtocol,
        context,
      );
    default: {
      const extraAcquisitionProtocolTransformers = context.plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraAcquisitionProtocolTransformers?.() ?? [],
      );
      for (const transformer of extraAcquisitionProtocolTransformers) {
        const protocol = transformer(element, context);
        if (protocol) {
          return protocol;
        }
      }
      throw new UnsupportedOperationError(
        `Unsupported acquisition protocol '${typeof element}'`,
      );
    }
  }
};

/**********
 * authorization
 **********/

export const V1_transformAuthorization = (
  element: Authorization | undefined,
  context: V1_GraphTransformerContext,
): V1_Authorization | undefined => {
  if (element === undefined) {
    return element;
  }
  const extraAuthorizationTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAuthorizationTransformers?.() ?? [],
  );
  for (const transformer of extraAuthorizationTransformers) {
    const protocol = transformer(element, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Unsupported authorization '${typeof element}'`,
  );
};

/**********
 * sources
 **********/

export const V1_transformRecordService = (
  element: RecordService,
  context: V1_GraphTransformerContext,
): V1_RecordService => {
  const recordService = new V1_RecordService();
  recordService.parseService = element.parseService;
  recordService.transformService = element.transformService;
  recordService.acquisitionProtocol = V1_transformAcquisitionProtocol(
    element.acquisitionProtocol,
    context,
  );
  return recordService;
};

export const V1_transformRecordSource = (
  element: RecordSource,
  context: V1_GraphTransformerContext,
): V1_RecordSource => {
  const recordSource = new V1_RecordSource();
  recordSource.id = element.id;
  recordSource.status = element.status.valueOf() as V1_RecordSourceStatus;
  recordSource.description = element.description;
  recordSource.sequentialData = element.sequentialData;
  recordSource.stagedLoad = element.stagedLoad;
  recordSource.createPermitted = element.createPermitted;
  recordSource.createBlockedException = element.createBlockedException;
  recordSource.allowFieldDelete = element.allowFieldDelete;
  recordSource.recordService = V1_transformRecordService(
    element.recordService,
    context,
  );
  recordSource.trigger = V1_transformTrigger(element.trigger, context);
  recordSource.authorization = V1_transformAuthorization(
    element.authorization,
    context,
  );
  recordSource.dataProvider = element.dataProvider;
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
  protocol.postCurationEnrichmentService =
    element.postCurationEnrichmentService;
  protocol.precedenceRules = element.precedenceRules?.map((rule) =>
    V1_transformPrecedenceRule(rule, context),
  );
  protocol.sources = element.sources.map((s) =>
    V1_transformRecordSource(s, context),
  );
  return protocol;
};
