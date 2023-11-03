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

import type {
  MasterRecordDefinition,
  CollectionEquality,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import type {
  IdentityResolution,
  ResolutionQuery,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_IdentityResolution.js';
import type {
  RecordService,
  RecordSource,
  RecordSourcePartition,
  RecordSourceDependency,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_RecordSource.js';
import {
  V1_CollectionEquality,
  V1_MasterRecordDefinition,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_MasterRecordDefinition.js';
import {
  V1_IdentityResolution,
  V1_ResolutionQuery,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_IdentityResolution.js';
import {
  type V1_RecordSourceStatus,
  type V1_Profile,
  V1_RecordService,
  V1_RecordSource,
  V1_RecordSourcePartition,
  V1_RecordSourceDependency,
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
  type V1_Decryption,
  V1_FileAcquisitionProtocol,
  V1_KafkaAcquisitionProtocol,
  V1_LegendServiceAcquisitionProtocol,
  V1_RestAcquisitionProtocol,
  V1_DESDecryption,
  V1_PGPDecryption,
} from '../../../model/packageableElements/mastery/V1_DSL_Mastery_AcquisitionProtocol.js';
import {
  type AcquisitionProtocol,
  type Decryption,
  FileAcquisitionProtocol,
  KafkaAcquisitionProtocol,
  LegendServiceAcquisitionProtocol,
  RestAcquisitionProtocol,
  DESDecryption,
  PGPDecryption,
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
import { V1_MasteryRuntime } from '../../../model/packageableElements/mastery/V1_DSL_Mastery_Runtime.js';
import { MasteryRuntime } from '../../../../../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Runtime.js';

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
  if (element instanceof ManualTrigger) {
    return new V1_ManualTrigger();
  } else if (element instanceof CronTrigger) {
    return V1_transformCronTrigger(element, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform trigger '${typeof element}'`,
  );
};

/**********
 * credential secret
 **********/

export const V1_transformCredentialSecret = (
  element: CredentialSecret,
  context: V1_GraphTransformerContext,
): V1_CredentialSecret => {
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
    `Can't transform credential secret '${typeof element}'`,
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
  ntlmAuthenticationStrategy.credential = element.credential
    ? V1_transformCredentialSecret(element.credential, context)
    : undefined;
  return ntlmAuthenticationStrategy;
};

export const V1_transformTokenAuthenticationStrategy = (
  element: TokenAuthenticationStrategy,
  context: V1_GraphTransformerContext,
): V1_TokenAuthenticationStrategy => {
  const tokenAuthenticationStrategy = new V1_TokenAuthenticationStrategy();
  tokenAuthenticationStrategy.credential = element.credential
    ? V1_transformCredentialSecret(element.credential, context)
    : undefined;
  tokenAuthenticationStrategy.tokenUrl = element.tokenUrl;
  return tokenAuthenticationStrategy;
};

export const V1_transformAuthenticationStrategy = (
  element: AuthenticationStrategy,
  context: V1_GraphTransformerContext,
): V1_AuthenticationStrategy => {
  if (element instanceof NTLMAuthenticationStrategy) {
    return V1_transformNTLMAuthenticationStrategy(element, context);
  } else if (element instanceof TokenAuthenticationStrategy) {
    return V1_transformTokenAuthenticationStrategy(element, context);
  }
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
    `Can't transform authentication strategy '${typeof element}'`,
  );
};

/**********
 * connection
 **********/

export const V1_transformProxyConfiguration = (
  element: ProxyConfiguration,
  context: V1_GraphTransformerContext,
): V1_ProxyConfiguration => {
  const proxyConfiguration = new V1_ProxyConfiguration();
  proxyConfiguration.authenticationStrategy = element.authenticationStrategy
    ? V1_transformAuthenticationStrategy(
        element.authenticationStrategy,
        context,
      )
    : undefined;
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
  ftpConnection.authenticationStrategy = element.authenticationStrategy
    ? V1_transformAuthenticationStrategy(
        element.authenticationStrategy,
        context,
      )
    : undefined;
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
  httpConnection.authenticationStrategy = element.authenticationStrategy
    ? V1_transformAuthenticationStrategy(
        element.authenticationStrategy,
        context,
      )
    : undefined;
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
  kafkaConnection.authenticationStrategy = element.authenticationStrategy
    ? V1_transformAuthenticationStrategy(
        element.authenticationStrategy,
        context,
      )
    : undefined;
  kafkaConnection.topicName = element.topicName;
  kafkaConnection.topicUrls = element.topicUrls;
  return kafkaConnection;
};

/**********
 * decryption
 **********/

export const V1_transformPGPDecryption = (
  element: PGPDecryption,
  context: V1_GraphTransformerContext,
): V1_PGPDecryption => {
  const pgpDecryption = new V1_PGPDecryption();
  pgpDecryption.privateKey = V1_transformCredentialSecret(
    element.privateKey,
    context,
  );
  pgpDecryption.passPhrase = V1_transformCredentialSecret(
    element.passPhrase,
    context,
  );
  return pgpDecryption;
};

export const V1_transformDESDecryption = (
  element: DESDecryption,
  context: V1_GraphTransformerContext,
): V1_DESDecryption => {
  const desDecryption = new V1_DESDecryption();
  desDecryption.decryptionKey = V1_transformCredentialSecret(
    element.decryptionKey,
    context,
  );
  desDecryption.capOption = element.capOption;
  desDecryption.uuEncode = element.uuEncode;
  return desDecryption;
};

export const V1_transformDecryption = (
  element: Decryption,
  context: V1_GraphTransformerContext,
): V1_Decryption => {
  if (element instanceof PGPDecryption) {
    return V1_transformPGPDecryption(element, context);
  } else if (element instanceof DESDecryption) {
    return V1_transformDESDecryption(element, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform decryption '${typeof element}'`,
  );
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
  fileAcquisitionProtocol.maxRetryTimeInMinutes = element.maxRetryTimeInMinutes;
  fileAcquisitionProtocol.encoding = element.encoding;
  fileAcquisitionProtocol.decryption = element.decryption
    ? V1_transformDecryption(element.decryption, context)
    : undefined;
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
  if (element instanceof LegendServiceAcquisitionProtocol) {
    return V1_transformLegendServiceAcquisitionProtocol(element, context);
  } else if (element instanceof FileAcquisitionProtocol) {
    return V1_transformFileAcquisitionProtocol(element, context);
  } else if (element instanceof KafkaAcquisitionProtocol) {
    return V1_transformKafkaAcquisitionProtocol(element, context);
  } else if (element instanceof RestAcquisitionProtocol) {
    return V1_transformRestAcquisitionProtocol(element, context);
  }
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
    `Can't transform acquisition protocol '${typeof element}'`,
  );
};

/**********
 * authorization
 **********/

export const V1_transformAuthorization = (
  element: Authorization,
  context: V1_GraphTransformerContext,
): V1_Authorization => {
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
    `Can't transform authorization '${typeof element}'`,
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
  recordService.acquisitionProtocol = element.acquisitionProtocol
    ? V1_transformAcquisitionProtocol(element.acquisitionProtocol, context)
    : undefined;
  return recordService;
};

export const V1_transformRecordSourcePartition = (
  element: RecordSourcePartition,
  context: V1_GraphTransformerContext,
): V1_RecordSourcePartition => {
  const recordSourcePartition = new V1_RecordSourcePartition();
  recordSourcePartition.id = element.id;
  return recordSourcePartition;
};

export const V1_transformRecordSourceDependency = (
  element: RecordSourceDependency,
  context: V1_GraphTransformerContext,
): V1_RecordSourceDependency => {
  const recordSourceDependency = new V1_RecordSourceDependency();
  recordSourceDependency.dependentRecordSourceId =
    element.dependentRecordSourceId;
  return recordSourceDependency;
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
  recordSource.recordService = element.recordService
    ? V1_transformRecordService(element.recordService, context)
    : undefined;
  recordSource.trigger = element.trigger
    ? V1_transformTrigger(element.trigger, context)
    : undefined;
  recordSource.authorization = element.authorization
    ? V1_transformAuthorization(element.authorization, context)
    : undefined;
  recordSource.dataProvider = element.dataProvider;
  recordSource.partitions = element.partitions
    ? element.partitions.map((p) =>
        V1_transformRecordSourcePartition(p, context),
      )
    : undefined;
  recordSource.parseService = element.parseService;
  recordSource.transformService = element.transformService;
  recordSource.raiseExceptionWorkflow = element.raiseExceptionWorkflow;
  recordSource.runProfile = element.runProfile
    ? (element.runProfile.valueOf() as V1_Profile)
    : undefined;
  recordSource.timeoutInMinutes = element.timeoutInMinutes;
  recordSource.dependencies = element.dependencies?.map((dependency) =>
    V1_transformRecordSourceDependency(dependency, context),
  );
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
  resolutionQuery.optional = element.optional;
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
  if (element instanceof DataProviderIdScope) {
    return V1_transformDataProviderIdScope(element, context);
  } else if (element instanceof DataProviderTypeScope) {
    return V1_transformDataProviderTypeScope(element, context);
  } else if (element instanceof RecordSourceScope) {
    return V1_transformRecordSourceScope(element, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform rule scope '${typeof element}'`,
  );
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
  if (element instanceof CreateRule) {
    return V1_transformCreateRule(element, context);
  } else if (element instanceof DeleteRule) {
    return V1_transformDeleteRule(element, context);
  } else if (element instanceof ConditionalRule) {
    return V1_transformConditionalRule(element, context);
  } else if (element instanceof SourcePrecedenceRule) {
    return V1_transformSourcePrecedenceRule(element, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform precedence rule '${typeof element}'`,
  );
};

/**********
 * collection equality
 **********/

export const V1_transformCollectionEquality = (
  element: CollectionEquality,
  context: V1_GraphTransformerContext,
): V1_CollectionEquality => {
  const collectionEquality = new V1_CollectionEquality();
  collectionEquality.modelClass = element.modelClass;
  collectionEquality.equalityFunction = element.equalityFunction;
  return collectionEquality;
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
  protocol.collectionEqualities = element.collectionEqualities?.map(
    (collectionEquality) =>
      V1_transformCollectionEquality(collectionEquality, context),
  );
  protocol.publishToElasticSearch = element.publishToElasticSearch;
  protocol.elasticSearchTransformService =
    element.elasticSearchTransformService;
  protocol.exceptionWorkflowTransformService =
    element.exceptionWorkflowTransformService;
  return protocol;
};

/**********
 * runtime
 **********/

export const V1_transformMasteryRuntime = (
  element: MasteryRuntime,
  context: V1_GraphTransformerContext,
): V1_MasteryRuntime => {
  const extraMasteryRuntimeTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMasteryRuntimeTransformers?.() ?? [],
  );
  for (const transformer of extraMasteryRuntimeTransformers) {
    const protocol = transformer(element, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform mastery runtime: no compatible transformer available from plugins, element`,
  );
};
