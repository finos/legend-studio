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

import type { PlainObject } from '@finos/legend-shared';
import type { V1_PrecedenceRule } from './v1/model/packageableElements/mastery/V1_DSL_Mastery_PrecedenceRule.js';
import type { V1_AcquisitionProtocol } from './v1/model/packageableElements/mastery/V1_DSL_Mastery_AcquisitionProtocol.js';
import type { AcquisitionProtocol } from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_AcquisitionProtocol.js';
import type { V1_Authorization } from './v1/model/packageableElements/mastery/V1_DSL_Mastery_Authorization.js';
import type { Authorization } from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Authorization.js';
import type { V1_MasteryRuntime } from './v1/model/packageableElements/mastery/V1_DSL_Mastery_Runtime.js';
import type { MasteryRuntime } from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Runtime.js';
import type {
  V1_AuthenticationStrategy,
  V1_CredentialSecret,
} from './v1/model/packageableElements/mastery/V1_DSL_Mastery_AuthenticationStrategy.js';
import type {
  AuthenticationStrategy,
  CredentialSecret,
} from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_AuthenticationStrategy.js';
import type {
  PureProtocolProcessorPlugin,
  V1_GraphBuilderContext,
  V1_GraphTransformerContext,
} from '@finos/legend-graph';

// types: precedence rules
export type V1_PrecedenceRuleProtocolSerializer = (
  protocol: V1_PrecedenceRule,
) => PlainObject<V1_PrecedenceRule> | undefined;

export type V1_PrecedenceRuleProtocolDeserializer = (
  json: PlainObject<V1_PrecedenceRule>,
) => V1_PrecedenceRule | undefined;

// types: acquisition protocol
export type V1_AcquisitionProtocolBuilder = (
  protocol: V1_AcquisitionProtocol,
  context: V1_GraphBuilderContext,
) => AcquisitionProtocol | undefined;

export type V1_AcquisitionProtocolTransformer = (
  metamodel: AcquisitionProtocol,
  context: V1_GraphTransformerContext,
) => V1_AcquisitionProtocol | undefined;

export type V1_AcquisitionProtocolSerializer = (
  protocol: V1_AcquisitionProtocol,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_AcquisitionProtocol> | undefined;

export type V1_AcquisitionProtocolDeserializer = (
  json: PlainObject<V1_AcquisitionProtocol>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_AcquisitionProtocol | undefined;

// types: authorization
export type V1_AuthorizationBuilder = (
  protocol: V1_Authorization,
  context: V1_GraphBuilderContext,
) => Authorization | undefined;

export type V1_AuthorizationTransformer = (
  metamodel: Authorization,
  context: V1_GraphTransformerContext,
) => V1_Authorization | undefined;

export type V1_AuthorizationProtocolSerializer = (
  protocol: V1_Authorization,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_Authorization> | undefined;

export type V1_AuthorizationProtocolDeserializer = (
  json: PlainObject<V1_Authorization>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_Authorization | undefined;

// types: credential secret
export type V1_CredentialSecretBuilder = (
  protocol: V1_CredentialSecret,
  context: V1_GraphBuilderContext,
) => CredentialSecret | undefined;

export type V1_CredentialSecretTransformer = (
  metamodel: CredentialSecret,
  context: V1_GraphTransformerContext,
) => V1_CredentialSecret | undefined;

export type V1_CredentialSecretProtocolSerializer = (
  protocol: V1_CredentialSecret,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_CredentialSecret> | undefined;

export type V1_CredentialSecretProtocolDeserializer = (
  json: PlainObject<V1_CredentialSecret>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_CredentialSecret | undefined;

// types: authentication strategy
export type V1_AuthenticationStrategyBuilder = (
  protocol: V1_AuthenticationStrategy,
  context: V1_GraphBuilderContext,
) => AuthenticationStrategy | undefined;

export type V1_AuthenticationStrategyTransformer = (
  metamodel: AuthenticationStrategy,
  context: V1_GraphTransformerContext,
) => V1_AuthenticationStrategy | undefined;

export type V1_AuthenticationStrategyProtocolSerializer = (
  protocol: V1_AuthenticationStrategy,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_AuthenticationStrategy> | undefined;

export type V1_AuthenticationStrategyProtocolDeserializer = (
  json: PlainObject<V1_AuthenticationStrategy>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_AuthenticationStrategy | undefined;

// types: mastery runtime
export type V1_MasteryRuntimeBuilder = (
  protocol: V1_MasteryRuntime,
  context: V1_GraphBuilderContext,
) => MasteryRuntime | undefined;

export type V1_MasteryRuntimeTransformer = (
  metamodel: MasteryRuntime,
  context: V1_GraphTransformerContext,
) => V1_MasteryRuntime | undefined;

export type V1_MasteryRuntimeProtocolSerializer = (
  protocol: V1_MasteryRuntime,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_MasteryRuntime> | undefined;

export type V1_MasteryRuntimeProtocolDeserializer = (
  json: PlainObject<V1_MasteryRuntime>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_MasteryRuntime | undefined;

export interface DSL_Mastery_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  // extension hooks: precedence rules
  V1_getExtraPrecedenceRuleProtocolSerializers?(): V1_PrecedenceRuleProtocolSerializer[];

  V1_getExtraPrecedenceRuleProtocolDeserializers?(): V1_PrecedenceRuleProtocolDeserializer[];

  // extension hooks: acquisition protocol
  V1_getExtraAcquisitionProtocolBuilders?(): V1_AcquisitionProtocolBuilder[];

  V1_getExtraAcquisitionProtocolTransformers?(): V1_AcquisitionProtocolTransformer[];

  V1_getExtraAcquisitionProtocolSerializers?(): V1_AcquisitionProtocolSerializer[];

  V1_getExtraAcquisitionProtocolDeserializers?(): V1_AcquisitionProtocolDeserializer[];

  // extension hooks: authorization
  V1_getExtraAuthorizationBuilders?(): V1_AuthorizationBuilder[];

  V1_getExtraAuthorizationTransformers?(): V1_AuthorizationTransformer[];

  V1_getExtraAuthorizationProtocolSerializers?(): V1_AuthorizationProtocolSerializer[];

  V1_getExtraAuthorizationProtocolDeserializers?(): V1_AuthorizationProtocolDeserializer[];

  // extension hooks: credential secret
  V1_getExtraCredentialSecretBuilders?(): V1_CredentialSecretBuilder[];

  V1_getExtraCredentialSecretTransformers?(): V1_CredentialSecretTransformer[];

  V1_getExtraCredentialSecretProtocolSerializers?(): V1_CredentialSecretProtocolSerializer[];

  V1_getExtraCredentialSecretProtocolDeserializers?(): V1_CredentialSecretProtocolDeserializer[];

  // extension hooks: authentication strategy
  V1_getExtraAuthenticationStrategyBuilders?(): V1_AuthenticationStrategyBuilder[];

  V1_getExtraAuthenticationStrategyTransformers?(): V1_AuthenticationStrategyTransformer[];

  V1_getExtraAuthenticationStrategyProtocolSerializers?(): V1_AuthenticationStrategyProtocolSerializer[];

  V1_getExtraAuthenticationStrategyProtocolDeserializers?(): V1_AuthenticationStrategyProtocolDeserializer[];

  // extension hooks: runtime
  V1_getExtraMasteryRuntimeFirstPassBuilders?(): V1_MasteryRuntimeBuilder[];

  V1_getExtraMasteryRuntimeSecondPassBuilders?(): V1_MasteryRuntimeBuilder[];

  V1_getExtraMasteryRuntimeTransformers?(): V1_MasteryRuntimeTransformer[];

  V1_getExtraMasteryRuntimeProtocolSerializers?(): V1_MasteryRuntimeProtocolSerializer[];

  V1_getExtraMasteryRuntimeProtocolDeserializers?(): V1_MasteryRuntimeProtocolDeserializer[];
}
