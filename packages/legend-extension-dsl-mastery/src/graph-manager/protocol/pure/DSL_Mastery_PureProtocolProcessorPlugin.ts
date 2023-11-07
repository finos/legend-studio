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

import packageJson from '../../../../package.json' assert { type: 'json' };
import { MasterRecordDefinition } from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import { V1_MasterRecordDefinition } from './v1/model/packageableElements/mastery/V1_DSL_Mastery_MasterRecordDefinition.js';
import {
  V1_conditionalRuleSchema,
  V1_ConnectionType,
  V1_createRuleSchema,
  V1_DATA_PROVIDER_ELEMENT_PROTOCOL_TYPE,
  V1_dataProviderModelSchema,
  V1_deleteRuleSchema,
  V1_deserializeMasteryRuntime,
  V1_FTPConnectionSchema,
  V1_HTTPConnectionSchema,
  V1_KafkaConnectionSchema,
  V1_MASTER_RECORD_DEFINITION_ELEMENT_PROTOCOL_TYPE,
  V1_masterRecordDefinitionModelSchema,
  V1_serializeMasteryRuntime,
  V1_sourcePrecedenceRuleSchema,
} from './v1/transformation/pureProtocol/V1_DSL_Mastery_ProtocolHelper.js';
import {
  V1_buildDataProvider,
  V1_buildFTPConnection,
  V1_buildHTTPConnection,
  V1_buildKafkaConnection,
  V1_buildMasterRecordDefinition,
  V1_buildMasteryRuntime,
} from './v1/transformation/pureGraph/to/V1_DSL_Mastery_BuilderHelper.js';
import {
  V1_transformDataProvider,
  V1_transformFTPConnection,
  V1_transformHTTPConnection,
  V1_transformKafkaConnection,
  V1_transformMasterRecordDefinition,
  V1_transformMasteryRuntime,
} from './v1/transformation/pureGraph/from/V1_DSL_Mastery_TransformerHelper.js';
import {
  type PackageableElement,
  PureProtocolProcessorPlugin,
  V1_ElementBuilder,
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
  type V1_PackageableElement,
  V1_buildFullPath,
} from '@finos/legend-graph';
import {
  type PlainObject,
  assertType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import type {
  DSL_Mastery_PureProtocolProcessorPlugin_Extension,
  V1_PrecedenceRuleProtocolDeserializer,
  V1_PrecedenceRuleProtocolSerializer,
} from './DSL_Mastery_PureProtocolProcessorPlugin_Extension.js';
import {
  type V1_PrecedenceRule,
  V1_RuleType,
} from './v1/model/packageableElements/mastery/V1_DSL_Mastery_PrecedenceRule.js';
import { V1_DataProvider } from './v1/model/packageableElements/mastery/V1_DSL_Mastery_DataProvider.js';
import { DataProvider } from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_DataProvider.js';
import {
  FTPConnection,
  HTTPConnection,
  KafkaConnection,
} from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Connection.js';
import {
  V1_FTPConnection,
  V1_HTTPConnection,
  V1_KafkaConnection,
} from './v1/model/packageableElements/mastery/V1_DSL_Mastery_Connection.js';
import { V1_MasteryRuntime } from './v1/model/packageableElements/mastery/V1_DSL_Mastery_Runtime.js';
import { MasteryRuntime } from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Runtime.js';

export const MASTER_RECORD_DEFINITION_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::mastery::metamodel::MasterRecordDefinition';

export const DATA_PROVIDER_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::mastery::metamodel::precedence::DataProvider';

export const KAFKA_CONNECTION_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::mastery::metamodel::connection::KafkaConnection';

export const FTP_CONNECTION_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::mastery::metamodel::connection::FTPConnection';

export const HTTP_CONNECTION_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::mastery::metamodel::connection::HTTPConnection';

export const KAFKA_CONNECTION_ELEMENT_CLASS_NAME = 'KafkaConnection';
export const FTP_CONNECTION_ELEMENT_CLASS_NAME = 'FTPConnection';
export const HTTP_CONNECTION_ELEMENT_CLASS_NAME = 'HTTPConnection';
export const MASTER_RECORD_DEFINITION_ELEMENT_CLASS_NAME =
  'MasterRecordDefinition';
export const DATA_PROVIDER_ELEMENT_CLASS_NAME = 'DataProvider';
export const MASTERY_RUNTIME_ELEMENT_CLASS_NAME = 'MasteryRuntime';

export class DSL_Mastery_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements DSL_Mastery_PureProtocolProcessorPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_KafkaConnection>({
        elementClassName: KAFKA_CONNECTION_ELEMENT_CLASS_NAME,
        _class: V1_KafkaConnection,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_KafkaConnection);
          const element = new KafkaConnection(elementProtocol.name);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            KafkaConnection,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_KafkaConnection);
          V1_buildKafkaConnection(elementProtocol, context);
        },
      }),
      new V1_ElementBuilder<V1_FTPConnection>({
        elementClassName: FTP_CONNECTION_ELEMENT_CLASS_NAME,
        _class: V1_FTPConnection,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_FTPConnection);
          const element = new FTPConnection(elementProtocol.name);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            FTPConnection,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_FTPConnection);
          V1_buildFTPConnection(elementProtocol, context);
        },
      }),
      new V1_ElementBuilder<V1_HTTPConnection>({
        elementClassName: HTTP_CONNECTION_ELEMENT_CLASS_NAME,
        _class: V1_HTTPConnection,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_HTTPConnection);
          const element = new HTTPConnection(elementProtocol.name);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            HTTPConnection,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_HTTPConnection);
          V1_buildHTTPConnection(elementProtocol, context);
        },
      }),
      new V1_ElementBuilder<V1_MasterRecordDefinition>({
        elementClassName: MASTER_RECORD_DEFINITION_ELEMENT_CLASS_NAME,
        _class: V1_MasterRecordDefinition,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_MasterRecordDefinition);
          const element = new MasterRecordDefinition(elementProtocol.name);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            MasterRecordDefinition,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_MasterRecordDefinition);
          V1_buildMasterRecordDefinition(elementProtocol, context);
        },
      }),
      new V1_ElementBuilder<V1_DataProvider>({
        elementClassName: DATA_PROVIDER_ELEMENT_CLASS_NAME,
        _class: V1_DataProvider,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_DataProvider);
          const element = new DataProvider(elementProtocol.name);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            DataProvider,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_DataProvider);
          V1_buildDataProvider(elementProtocol, context);
        },
      }),
      new V1_ElementBuilder<V1_MasteryRuntime>({
        elementClassName: MASTERY_RUNTIME_ELEMENT_CLASS_NAME,
        _class: V1_MasteryRuntime,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          const extraMasteryRuntimeBuilders =
            context.extensions.plugins.flatMap(
              (plugin) =>
                (
                  plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
                ).V1_getExtraMasteryRuntimeFirstPassBuilders?.() ?? [],
            );
          for (const builder of extraMasteryRuntimeBuilders) {
            const metamodel = builder(
              elementProtocol as V1_MasteryRuntime,
              context,
            );
            if (metamodel) {
              return metamodel;
            }
          }
          throw new UnsupportedOperationError(
            `Can't build runtime: no compatible builder available from plugins, elementProtocol`,
          );
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          V1_buildMasteryRuntime(elementProtocol as V1_MasteryRuntime, context);
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_MasterRecordDefinition) {
          return MASTER_RECORD_DEFINITION_ELEMENT_CLASSIFIER_PATH;
        } else if (elementProtocol instanceof V1_DataProvider) {
          return DATA_PROVIDER_ELEMENT_CLASSIFIER_PATH;
        } else if (elementProtocol instanceof V1_KafkaConnection) {
          return KAFKA_CONNECTION_ELEMENT_CLASSIFIER_PATH;
        } else if (elementProtocol instanceof V1_FTPConnection) {
          return FTP_CONNECTION_ELEMENT_CLASSIFIER_PATH;
        } else if (elementProtocol instanceof V1_HTTPConnection) {
          return HTTP_CONNECTION_ELEMENT_CLASSIFIER_PATH;
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolSerializers(): V1_ElementProtocolSerializer[] {
    return [
      (
        elementProtocol: V1_PackageableElement,
        plugins: PureProtocolProcessorPlugin[],
      ): PlainObject<V1_PackageableElement> | undefined => {
        if (elementProtocol instanceof V1_MasterRecordDefinition) {
          return serialize(
            V1_masterRecordDefinitionModelSchema(plugins),
            elementProtocol,
          );
        } else if (elementProtocol instanceof V1_DataProvider) {
          return serialize(
            V1_dataProviderModelSchema(plugins),
            elementProtocol,
          );
        } else if (elementProtocol instanceof V1_KafkaConnection) {
          return serialize(V1_KafkaConnectionSchema(plugins), elementProtocol);
        } else if (elementProtocol instanceof V1_FTPConnection) {
          return serialize(V1_FTPConnectionSchema(plugins), elementProtocol);
        } else if (elementProtocol instanceof V1_HTTPConnection) {
          return serialize(V1_HTTPConnectionSchema(plugins), elementProtocol);
        } else if (elementProtocol instanceof V1_MasteryRuntime) {
          return V1_serializeMasteryRuntime(elementProtocol, plugins);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolDeserializers(): V1_ElementProtocolDeserializer[] {
    return [
      (
        json: PlainObject<V1_PackageableElement>,
        plugins: PureProtocolProcessorPlugin[],
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_MASTER_RECORD_DEFINITION_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(
            V1_masterRecordDefinitionModelSchema(plugins),
            json,
          );
        } else if (json._type === V1_DATA_PROVIDER_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_dataProviderModelSchema(plugins), json);
        } else if (json._type === V1_ConnectionType.KAFKA) {
          return deserialize(V1_KafkaConnectionSchema(plugins), json);
        } else if (json._type === V1_ConnectionType.FTP) {
          return deserialize(V1_FTPConnectionSchema(plugins), json);
        } else if (json._type === V1_ConnectionType.HTTP) {
          return deserialize(V1_HTTPConnectionSchema(plugins), json);
        }
        return V1_deserializeMasteryRuntime(json, plugins);
      },
    ];
  }

  override V1_getExtraElementTransformers(): V1_ElementTransformer[] {
    return [
      (
        metamodel: PackageableElement,
        context: V1_GraphTransformerContext,
      ): V1_PackageableElement | undefined => {
        if (metamodel instanceof MasterRecordDefinition) {
          return V1_transformMasterRecordDefinition(metamodel, context);
        } else if (metamodel instanceof DataProvider) {
          return V1_transformDataProvider(metamodel, context);
        } else if (metamodel instanceof KafkaConnection) {
          return V1_transformKafkaConnection(metamodel, context);
        } else if (metamodel instanceof FTPConnection) {
          return V1_transformFTPConnection(metamodel, context);
        } else if (metamodel instanceof HTTPConnection) {
          return V1_transformHTTPConnection(metamodel, context);
        } else if (metamodel instanceof MasteryRuntime) {
          return V1_transformMasteryRuntime(metamodel, context);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraPrecedenceRuleProtocolSerializers?(): V1_PrecedenceRuleProtocolSerializer[] {
    return [
      (
        protocol: V1_PrecedenceRule,
      ): PlainObject<V1_PrecedenceRule> | undefined => {
        switch (protocol._type) {
          case V1_RuleType.CREATE_RULE:
            return serialize(V1_createRuleSchema, protocol);
          case V1_RuleType.CONDITIONAL_RULE:
            return serialize(V1_conditionalRuleSchema, protocol);
          case V1_RuleType.SOURCE_PRECEDENCE_RULE:
            return serialize(V1_sourcePrecedenceRuleSchema, protocol);
          case V1_RuleType.DELETE_RULE:
            return serialize(V1_deleteRuleSchema, protocol);
          default:
            return undefined;
        }
      },
    ];
  }

  V1_getExtraPrecedenceRuleProtocolDeserializers?(): V1_PrecedenceRuleProtocolDeserializer[] {
    return [
      (json: PlainObject<V1_PrecedenceRule>): V1_PrecedenceRule | undefined => {
        switch (json._type) {
          case V1_RuleType.CREATE_RULE:
            return deserialize(V1_createRuleSchema, json);
          case V1_RuleType.CONDITIONAL_RULE:
            return deserialize(V1_conditionalRuleSchema, json);
          case V1_RuleType.SOURCE_PRECEDENCE_RULE:
            return deserialize(V1_sourcePrecedenceRuleSchema, json);
          case V1_RuleType.DELETE_RULE:
            return deserialize(V1_deleteRuleSchema, json);
          default:
            return undefined;
        }
      },
    ];
  }
}
