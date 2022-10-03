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
import V1_SYSTEM_MODELS from './v1/V1_DSL_DataSpace_SystemModels.json';
import {
  V1_DataSpace,
  V1_DataSpaceExecutionContext,
  V1_DataSpaceSupportEmail,
} from './v1/model/packageableElements/dataSpace/V1_DSL_DataSpace_DataSpace.js';
import {
  type PlainObject,
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
} from './v1/transformation/pureProtocol/V1_DSL_DataSpace_ProtocolHelper.js';
import { getOwnDataSpace } from '../../DSL_DataSpace_GraphManagerHelper.js';
import {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceSupportEmail,
} from '../../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import {
  type PackageableElement,
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
  type V1_PackageableElement,
  type V1_PureModelContextData,
  type V1_TaggedValue,
  V1_taggedValueSchema,
  PackageableElementExplicitReference,
  V1_PackageableElementPointer,
  PackageableElementPointerType,
  V1_buildTaggedValue,
  V1_transformStereotype,
  V1_transformTaggedValue,
  PureProtocolProcessorPlugin,
  V1_ElementBuilder,
  V1_initPackageableElement,
  V1_buildFullPath,
} from '@finos/legend-graph';
import {
  V1_DSL_Diagram_PackageableElementPointerType,
  getDiagram,
} from '@finos/legend-extension-dsl-diagram';

export const DATA_SPACE_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::metamodel::dataSpace::DataSpace';

export class DSL_DataSpace_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
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
          const path = V1_buildFullPath(
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
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getOwnDataSpace(path, context.currentSubGraph);
          element.stereotypes = elementProtocol.stereotypes
            .map((stereotype) => context.resolveStereotype(stereotype))
            .filter(isNonNullable);
          element.taggedValues = elementProtocol.taggedValues
            .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
            .filter(isNonNullable);
          element.executionContexts = guaranteeNonNullable(
            elementProtocol.executionContexts,
            `Data space 'executionContexts' field is missing`,
          ).map((contextProtocol) => {
            const execContext = new DataSpaceExecutionContext();
            execContext.name = guaranteeNonEmptyString(
              contextProtocol.name,
              `Data space execution context 'name' field is missing or empty`,
            );
            execContext.description = contextProtocol.description;
            execContext.mapping = PackageableElementExplicitReference.create(
              context.graph.getMapping(contextProtocol.mapping.path),
            );
            execContext.defaultRuntime =
              PackageableElementExplicitReference.create(
                context.graph.getRuntime(contextProtocol.defaultRuntime.path),
              );
            return execContext;
          });
          element.defaultExecutionContext = guaranteeNonNullable(
            element.executionContexts.find(
              (execContext) =>
                execContext.name ===
                guaranteeNonEmptyString(
                  elementProtocol.defaultExecutionContext,
                  `Data space 'defaultExecutionContext' field is missing or empty`,
                ),
            ),
            `Can't find default execution context '${elementProtocol.defaultExecutionContext}'`,
          );
          element.title = elementProtocol.title;
          element.description = elementProtocol.description;
          if (elementProtocol.featuredDiagrams) {
            element.featuredDiagrams = elementProtocol.featuredDiagrams.map(
              (pointer) =>
                PackageableElementExplicitReference.create(
                  getDiagram(pointer.path, context.graph),
                ),
            );
          }
          if (elementProtocol.supportInfo) {
            if (
              elementProtocol.supportInfo instanceof V1_DataSpaceSupportEmail
            ) {
              const supportEmail = new DataSpaceSupportEmail();
              supportEmail.address = guaranteeNonEmptyString(
                elementProtocol.supportInfo.address,
                `Data space support email 'address' field is missing or empty`,
              );
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
        plugins: PureProtocolProcessorPlugin[],
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
        plugins: PureProtocolProcessorPlugin[],
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
          protocol.executionContexts = metamodel.executionContexts.map(
            (execContext) => {
              const contextProtocol = new V1_DataSpaceExecutionContext();
              contextProtocol.name = execContext.name;
              contextProtocol.description = execContext.description;
              contextProtocol.mapping = new V1_PackageableElementPointer(
                PackageableElementPointerType.MAPPING,
                execContext.mapping.valueForSerialization ?? '',
              );
              contextProtocol.defaultRuntime = new V1_PackageableElementPointer(
                PackageableElementPointerType.RUNTIME,
                execContext.defaultRuntime.valueForSerialization ?? '',
              );
              return contextProtocol;
            },
          );
          protocol.defaultExecutionContext =
            metamodel.defaultExecutionContext.name;
          protocol.title = metamodel.title;
          protocol.description = metamodel.description;
          protocol.featuredDiagrams = metamodel.featuredDiagrams?.map(
            (diagramPath) =>
              new V1_PackageableElementPointer(
                V1_DSL_Diagram_PackageableElementPointerType,
                diagramPath.valueForSerialization ?? '',
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
          return protocol;
        }
        return undefined;
      },
    ];
  }
}

export const extractDataSpaceTaxonomyNodes = (
  json: PlainObject<V1_DataSpace>,
): string[] => {
  const ENTERPRISE_PROFILE_PATH = `meta::pure::profiles::enterprise`;
  const TAXONOMY_NODES_TAG = `taxonomyNodes`;
  const TAXONOMY_NODES_TAG_VALUE_DELIMITER = `,`;

  const taxonomyNodes = new Set<string>();
  if (json._type === V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE) {
    if (Array.isArray(json.taggedValues)) {
      const taggedValues = (
        json.taggedValues as PlainObject<V1_TaggedValue>[]
      ).map((taggedValueJson) =>
        deserialize(V1_taggedValueSchema, taggedValueJson),
      );
      taggedValues
        .filter(
          (taggedValue) =>
            taggedValue.tag.profile === ENTERPRISE_PROFILE_PATH &&
            taggedValue.tag.value === TAXONOMY_NODES_TAG,
        )
        .forEach((taggedValue) => {
          taggedValue.value
            .split(TAXONOMY_NODES_TAG_VALUE_DELIMITER)
            .map((value) => value.trim())
            .filter((value) => Boolean(value))
            .forEach((value) => taxonomyNodes.add(value));
        });
    }
  }
  return Array.from(taxonomyNodes.values());
};
