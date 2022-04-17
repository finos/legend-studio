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
} from './v1/model/packageableElements/dataSpace/V1_DSLDataSpace_DataSpace';
import {
  type PlainObject,
  uuid,
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
  type DataSpaceSupportInfo,
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceSupportEmail,
} from '../../metamodels/pure/model/packageableElements/dataSpace/DSLDataSpace_DataSpace';
import {
  type Mapping,
  type PackageableElement,
  type PackageableElementReference,
  type PackageableRuntime,
  type PureModel,
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
  V1_PackageableElementPointerType,
  V1_buildTaggedValue,
  V1_transformStereotype,
  V1_transformTaggedValue,
  PureProtocolProcessorPlugin,
  V1_ElementBuilder,
  V1_initPackageableElement,
  V1_StereotypePtr,
  V1_buildFullPath,
} from '@finos/legend-graph';
import {
  Diagram,
  V1_DSLDiagram_PackageableElementPointerType,
} from '@finos/legend-extension-dsl-diagram';

export const DATA_SPACE_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::metamodel::dataSpace::DataSpace';

export class DSLDataSpace_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
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
            const execContext = new DataSpaceExecutionContext();
            execContext.name = guaranteeNonEmptyString(
              contextProtocol.name,
              `Data space execution context 'name' field is missing or empty`,
            );
            execContext.description = contextProtocol.description;
            execContext.mapping = guaranteeNonNullable(
              contextProtocol.mapping,
              `Data space execution context 'mapping' field is missing or empty`,
            ).path;
            execContext.defaultRuntime = guaranteeNonNullable(
              contextProtocol.defaultRuntime,
              `Data space execution context 'defaultRuntime' field is missing or empty`,
            ).path;
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
          element.description = elementProtocol.description;
          if (elementProtocol.featuredDiagrams) {
            element.featuredDiagrams = elementProtocol.featuredDiagrams.map(
              (pointer) => pointer.path,
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
          protocol.groupId = metamodel.groupId;
          protocol.artifactId = metamodel.artifactId;
          protocol.versionId = metamodel.versionId;
          protocol.executionContexts = metamodel.executionContexts.map(
            (execContext) => {
              const contextProtocol = new V1_DataSpaceExecutionContext();
              contextProtocol.name = execContext.name;
              contextProtocol.description = execContext.description;
              contextProtocol.mapping = new V1_PackageableElementPointer(
                V1_PackageableElementPointerType.MAPPING,
                execContext.mapping,
              );
              contextProtocol.defaultRuntime = new V1_PackageableElementPointer(
                V1_PackageableElementPointerType.RUNTIME,
                execContext.defaultRuntime,
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

export class ResolvedDataSpaceExecutionContext {
  name!: string;
  description?: string | undefined;
  mapping!: PackageableElementReference<Mapping>;
  defaultRuntime!: PackageableElementReference<PackageableRuntime>;
}

/**
 * When we actually need to use the data space, we want to resolve all of its
 * element pointers to actual reference, hence this model.
 */
export class ResolvedDataSpace {
  taggedValues: {
    uuid: string;
    profile: string;
    tag: string;
    value: string;
  }[] = [];
  stereotypes: { uuid: string; profile: string; stereotype: string }[] = [];
  path!: string;
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  executionContexts: ResolvedDataSpaceExecutionContext[] = [];
  defaultExecutionContext!: ResolvedDataSpaceExecutionContext;
  featuredDiagrams: PackageableElementReference<Diagram>[] = [];
  description?: string | undefined;
  supportInfo?: DataSpaceSupportInfo | undefined;
}

export const getResolvedDataSpace = (
  json: PlainObject<V1_DataSpace>,
  graph: PureModel,
): ResolvedDataSpace => {
  const dataSpace = new ResolvedDataSpace();
  if (json._type === V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE) {
    const protocol = deserialize(V1_dataSpaceModelSchema, json);
    dataSpace.path = protocol.path;
    if (Array.isArray(json.taggedValues)) {
      dataSpace.taggedValues = (
        json.taggedValues as PlainObject<V1_TaggedValue>[]
      )
        .map((taggedValueJson) =>
          deserialize(V1_taggedValueSchema, taggedValueJson),
        )
        .map((taggedValue) => ({
          uuid: uuid(),
          profile: taggedValue.tag.profile,
          tag: taggedValue.tag.value,
          value: taggedValue.value,
        }));
    }
    if (Array.isArray(json.stereotypes)) {
      dataSpace.stereotypes = (
        json.stereotypes as PlainObject<V1_StereotypePtr>[]
      )
        .map((stereotypePtrJson) =>
          deserialize(V1_StereotypePtr, stereotypePtrJson),
        )
        .map((stereotypePtr) => ({
          uuid: uuid(),
          profile: stereotypePtr.profile,
          stereotype: stereotypePtr.value,
        }));
    }
    dataSpace.groupId = guaranteeNonEmptyString(
      protocol.groupId,
      `Data space 'groupId' field is missing or empty`,
    );
    dataSpace.artifactId = guaranteeNonEmptyString(
      protocol.artifactId,
      `Data space 'artifactId' field is missing or empty`,
    );
    dataSpace.versionId = guaranteeNonEmptyString(
      protocol.versionId,
      `Data space 'versionId' field is missing or empty`,
    );
    dataSpace.executionContexts = protocol.executionContexts.map(
      (contextProtocol) => {
        const context = new ResolvedDataSpaceExecutionContext();
        context.name = guaranteeNonEmptyString(
          contextProtocol.name,
          `Data space execution context 'name' field is missing or empty`,
        );
        context.description = contextProtocol.description;
        context.mapping = PackageableElementExplicitReference.create(
          graph.getMapping(contextProtocol.mapping.path),
        );
        context.defaultRuntime = PackageableElementExplicitReference.create(
          graph.getRuntime(contextProtocol.defaultRuntime.path),
        );
        return context;
      },
    );
    dataSpace.defaultExecutionContext = guaranteeNonNullable(
      dataSpace.executionContexts.find(
        (context) =>
          context.name ===
          guaranteeNonEmptyString(
            protocol.defaultExecutionContext,
            `Data space 'defaultExecutionContext' field is missing or empty`,
          ),
      ),
      `Can't find default execution context '${protocol.defaultExecutionContext}'`,
    );
    dataSpace.description = protocol.description;
    if (protocol.featuredDiagrams) {
      dataSpace.featuredDiagrams = protocol.featuredDiagrams.map((pointer) =>
        PackageableElementExplicitReference.create(
          graph.getExtensionElement(pointer.path, Diagram),
        ),
      );
    }
    if (protocol.supportInfo) {
      if (protocol.supportInfo instanceof V1_DataSpaceSupportEmail) {
        const supportEmail = new DataSpaceSupportEmail();
        supportEmail.address = guaranteeNonEmptyString(
          protocol.supportInfo.address,
          `Data space support email 'address' field is missing or empty`,
        );
        dataSpace.supportInfo = supportEmail;
      } else {
        throw new UnsupportedOperationError(
          `Can't build data space support info`,
          protocol.supportInfo,
        );
      }
    }
    return dataSpace;
  }
  throw new UnsupportedOperationError(`Can't resolve data space`, json);
};

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
