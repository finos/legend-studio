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

import packageJson from '../../../../package.json';
import V1_SYSTEM_MODELS from './v1/V1_DSLDataSpace_SystemModels.json';
import {
  V1_DataSpace,
  V1_DataSpaceExecutionContext,
  V1_DataSpaceSupportEmail,
} from './v1/model/packageableElements/dataSpace/V1_DataSpace';
import type { PlainObject } from '@finos/legend-shared';
import {
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  UnsupportedOperationError,
  isNonNullable,
  assertType,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  V1_dataSpaceModelSchema,
  V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_DSLDataSpace_ProtocolHelper';
import { getDataSpace } from '../../../graphManager/DSLDataSpace_GraphManagerHelper';
import {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceSupportEmail,
} from '../../metamodels/pure/model/packageableElements/dataSpace/DataSpace';
import type {
  GraphPluginManager,
  PackageableElement,
  V1_ElementProtocolClassifierPathGetter,
  V1_ElementProtocolDeserializer,
  V1_ElementProtocolSerializer,
  V1_ElementTransformer,
  V1_GraphBuilderContext,
  V1_GraphTransformerContext,
  V1_PackageableElement,
  V1_PureModelContextData,
} from '@finos/legend-graph';
import {
  V1_PackageableElementPointer,
  V1_PackageableElementPointerType,
  V1_buildTaggedValue,
  V1_transformStereotype,
  V1_transformTaggedValue,
  PureProtocolProcessorPlugin,
  V1_ElementBuilder,
  V1_initPackageableElement,
} from '@finos/legend-graph';
import { V1_DSLDiagram_PackageableElementPointerType } from '@finos/legend-extension-dsl-diagram';

const DATA_SPACE_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::metamodel::dataSpace::DataSpace';

export class DSLDataSpace_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  install(pluginManager: GraphPluginManager): void {
    pluginManager.registerPureProtocolProcessorPlugin(this);
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_DataSpace>({
        elementClassName: 'DataSpace',
        _class: V1_DataSpace,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_DataSpace);
          const element = new DataSpace(elementProtocol.name);
          const path = context.currentSubGraph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            DataSpace,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_DataSpace);
          const path = context.graph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getDataSpace(path, context.graph);
          element.stereotypes = elementProtocol.stereotypes
            .map((stereotype) => context.resolveStereotype(stereotype))
            .filter(isNonNullable);
          element.taggedValues = elementProtocol.taggedValues
            .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
            .filter(isNonNullable);
          element.groupId = guaranteeNonEmptyString(
            elementProtocol.groupId,
            `Data space 'groupId' field is missing or empty`,
          );
          element.artifactId = guaranteeNonEmptyString(
            elementProtocol.artifactId,
            `Data space 'artifactId' field is missing or empty`,
          );
          element.versionId = guaranteeNonEmptyString(
            elementProtocol.versionId,
            `Data space 'versionId' field is missing or empty`,
          );
          element.executionContexts = guaranteeNonNullable(
            elementProtocol.executionContexts,
            `Data space 'executionContexts' field is missing`,
          ).map((contextProtocol) => {
            const context = new DataSpaceExecutionContext();
            context.name = guaranteeNonEmptyString(
              contextProtocol.name,
              `Data space execution context 'name' field is missing or empty`,
            );
            context.description = contextProtocol.description;
            context.mapping = guaranteeNonNullable(
              contextProtocol.mapping,
              `Data space execution context 'mapping' field is missing or empty`,
            ).path;
            context.defaultRuntime = guaranteeNonNullable(
              contextProtocol.defaultRuntime,
              `Data space execution context 'defaultRuntime' field is missing or empty`,
            ).path;
            return context;
          });
          element.defaultExecutionContext = guaranteeNonNullable(
            element.executionContexts.find(
              (context) =>
                context.name ===
                guaranteeNonEmptyString(
                  elementProtocol.defaultExecutionContext,
                  `Data space 'defaultExecutionContext' field is missing or empty`,
                ),
            ),
            `Can't find default execution context '${elementProtocol.defaultExecutionContext}'`,
          );
          element.description = elementProtocol.description;
          element.featuredDiagrams = (
            elementProtocol.featuredDiagrams ?? []
          ).map((pointer) => pointer.path);
          if (elementProtocol.supportInfo) {
            if (
              elementProtocol.supportInfo instanceof V1_DataSpaceSupportEmail
            ) {
              const supportEmail = new DataSpaceSupportEmail();
              supportEmail.address = elementProtocol.supportInfo.address;
              element.supportInfo = supportEmail;
            } else {
              throw new UnsupportedOperationError(
                `Can't build data space support info`,
                elementProtocol.supportInfo,
              );
            }
          }
        },
      }),
    ];
  }

  override V1_getExtraSystemModels(): PlainObject<V1_PureModelContextData>[] {
    return [V1_SYSTEM_MODELS];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_DataSpace) {
          return DATA_SPACE_ELEMENT_CLASSIFIER_PATH;
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolSerializers(): V1_ElementProtocolSerializer[] {
    return [
      (
        elementProtocol: V1_PackageableElement,
      ): PlainObject<V1_PackageableElement> | undefined => {
        if (elementProtocol instanceof V1_DataSpace) {
          return serialize(V1_dataSpaceModelSchema, elementProtocol);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolDeserializers(): V1_ElementProtocolDeserializer[] {
    return [
      (
        json: PlainObject<V1_PackageableElement>,
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_dataSpaceModelSchema, json);
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
        if (metamodel instanceof DataSpace) {
          const protocol = new V1_DataSpace();
          V1_initPackageableElement(protocol, metamodel);
          protocol.stereotypes = metamodel.stereotypes.map(
            V1_transformStereotype,
          );
          protocol.taggedValues = metamodel.taggedValues.map(
            V1_transformTaggedValue,
          );
          protocol.groupId = metamodel.groupId;
          protocol.artifactId = metamodel.artifactId;
          protocol.versionId = metamodel.versionId;
          protocol.executionContexts = metamodel.executionContexts.map(
            (context) => {
              const contextProtocol = new V1_DataSpaceExecutionContext();
              contextProtocol.name = context.name;
              contextProtocol.description = context.description;
              contextProtocol.mapping = new V1_PackageableElementPointer(
                V1_PackageableElementPointerType.MAPPING,
                context.mapping,
              );
              contextProtocol.defaultRuntime = new V1_PackageableElementPointer(
                V1_PackageableElementPointerType.RUNTIME,
                context.defaultRuntime,
              );
              return contextProtocol;
            },
          );
          protocol.defaultExecutionContext =
            metamodel.defaultExecutionContext.name;
          protocol.description = metamodel.description;
          protocol.featuredDiagrams = metamodel.featuredDiagrams.map(
            (diagramPath) =>
              new V1_PackageableElementPointer(
                V1_DSLDiagram_PackageableElementPointerType,
                diagramPath,
              ),
          );
          if (metamodel.supportInfo) {
            if (metamodel.supportInfo instanceof DataSpaceSupportEmail) {
              const supportEmail = new V1_DataSpaceSupportEmail();
              supportEmail.address = metamodel.supportInfo.address;
              protocol.supportInfo = supportEmail;
            } else {
              throw new UnsupportedOperationError(
                `Can't transform data space support info`,
                metamodel.supportInfo,
              );
            }
          }
          // protocol.supportInfo = metamodel.supportInfo;
          return protocol;
        }
        return undefined;
      },
    ];
  }
}
