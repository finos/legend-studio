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
  V1_createRuleSchema,
  V1_deleteRuleSchema,
  V1_MASTER_RECORD_DEFINITION_ELEMENT_PROTOCOL_TYPE,
  V1_masterRecordDefinitionModelSchema,
  V1_sourcePrecedenceRuleSchema,
} from './v1/transformation/pureProtocol/V1_DSL_Mastery_ProtocolHelper.js';
import { V1_buildMasterRecordDefinition } from './v1/transformation/pureGraph/to/V1_DSL_Mastery_BuilderHelper.js';
import { V1_transformMasterRecordDefinition } from './v1/transformation/pureGraph/from/V1_DSL_Mastery_TransformerHelper.js';
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
import { assertType, type PlainObject } from '@finos/legend-shared';
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

export const MASTER_RECORD_DEFINITION_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::mastery::metamodel::MasterRecordDefinition';

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
      new V1_ElementBuilder<V1_MasterRecordDefinition>({
        elementClassName: 'MasterRecordDefinition',
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
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_MasterRecordDefinition) {
          return MASTER_RECORD_DEFINITION_ELEMENT_CLASSIFIER_PATH;
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
        }
        return undefined;
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
