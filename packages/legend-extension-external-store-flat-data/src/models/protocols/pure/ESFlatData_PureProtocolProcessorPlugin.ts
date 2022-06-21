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
  type Connection,
  type DSLMapping_PureProtocolProcessorPlugin_Extension,
  type EnumerationMapping,
  type InstanceSetImplementation,
  type Mapping,
  type PackageableElement,
  type PackageableElementReference,
  type PropertyMapping,
  type PropertyMappingsImplementation,
  type SetImplementation,
  type Store,
  type V1_ClassMapping,
  type V1_ClassMappingDeserializer,
  type V1_ClassMappingFirstPassBuilder,
  type V1_ClassMappingSecondPassBuilder,
  type V1_ClassMappingSerializer,
  type V1_ClassMappingTransformer,
  type V1_Connection,
  type V1_ConnectionBuilder,
  type V1_ConnectionProtocolDeserializer,
  type V1_ConnectionProtocolSerializer,
  type V1_ConnectionTransformer,
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
  type V1_PackageableElement,
  type V1_PropertyMapping,
  type V1_PropertyMappingBuilder,
  type V1_PropertyMappingTransformer,
  Class,
  getAllEnumerationMappings,
  getClassProperty,
  getOwnClassMappingById,
  GraphBuilderError,
  GRAPH_MANAGER_EVENT,
  InferableMappingElementIdExplicitValue,
  InferableMappingElementRootExplicitValue,
  OptionalEnumerationMappingExplicitReference,
  PackageableElementImplicitReference,
  PropertyImplicitReference,
  PureProtocolProcessorPlugin,
  V1_TEMPORARY__getClassMappingByIdOrReturnUnresolved,
  V1_buildFullPath,
  V1_buildRawLambdaWithResolvedPaths,
  V1_ElementBuilder,
  V1_getInferredClassMappingId,
  V1_ProtocolToMetaModelPropertyMappingBuilder,
  type PropertyMappingTransformationExcludabilityChecker,
  isStubbed_RawLambda,
  type V1_MappingTestInputDataTransformer,
  type InputData,
  type V1_InputData,
  type V1_MappingTestInputDataSerializer,
  type V1_MappingTestInputDataDeserializer,
  type V1_MappingTestInputDataBuilder,
} from '@finos/legend-graph';
import {
  assertNonEmptyString,
  assertNonNullable,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  LogEvent,
  type PlainObject,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import packageJson from '../../../../package.json';
import { getOwnFlatDataStore } from '../../../graphManager/ESFlatData_GraphManagerHelper.js';
import { FlatDataConnection } from '../../metamodels/pure/model/store/flatData/connection/ESFlatData_FlatDataConnection.js';
import type { AbstractFlatDataPropertyMapping } from '../../metamodels/pure/model/store/flatData/mapping/ESFlatData_AbstractFlatDataPropertyMapping.js';
import { EmbeddedFlatDataPropertyMapping } from '../../metamodels/pure/model/store/flatData/mapping/ESFlatData_EmbeddedFlatDataPropertyMapping.js';
import { FlatDataInputData } from '../../metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInputData.js';
import { FlatDataInstanceSetImplementation } from '../../metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInstanceSetImplementation.js';
import { FlatDataPropertyMapping } from '../../metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataPropertyMapping.js';
import { FlatData } from '../../metamodels/pure/model/store/flatData/model/ESFlatData_FlatData.js';
import { V1_FlatDataConnection } from './v1/model/store/flatData/connection/V1_ESFlatData_FlatDataConnection.js';
import { V1_EmbeddedFlatDataPropertyMapping } from './v1/model/store/flatData/mapping/V1_ESFlatData_EmbeddedFlatDataPropertyMapping.js';
import { V1_FlatDataInputData } from './v1/model/store/flatData/mapping/V1_ESFlatData_FlatDataInputData.js';
import { V1_FlatDataPropertyMapping } from './v1/model/store/flatData/mapping/V1_ESFlatData_FlatDataPropertyMapping.js';
import { V1_RootFlatDataClassMapping } from './v1/model/store/flatData/mapping/V1_ESFlatData_RootFlatDataClassMapping.js';
import { V1_FlatData } from './v1/model/store/flatData/model/V1_ESFlatData_FlatData.js';
import {
  V1_buildFlatDataSection,
  V1_resolveFlatDataStore,
  V1_resolveRootFlatDataRecordType,
} from './v1/transformation/pureGraph/V1_ESFlatData_GraphBuilderHelper.js';
import {
  V1_transformEmbeddedFlatDataPropertyMapping,
  V1_transformFlatData,
  V1_transformFlatDataInputData,
  V1_transformFlatDataInstanceSetImpl,
  V1_transformSimpleFlatDataPropertyMapping,
} from './v1/transformation/pureGraph/V1_ESFlatData_TransformerHelper.js';
import {
  V1_flatDataConnectionModelSchema,
  V1_flatDataInputData,
  V1_flatDataModelSchema,
  V1_FLAT_DATA_CLASS_MAPPING_PROTOCOL_TYPE,
  V1_FLAT_DATA_CONNECTION_PROTOCOL_TYPE,
  V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE,
  V1_FLAT_DATA_INPUT_DATA_PROTOCOL_TYPE,
  V1_rootFlatDataClassMappingModelSchema,
} from './v1/transformation/pureProtocol/V1_ESFlatData_ProtocolHelper.js';

const FLAT_DATA_STORE_ELEMENT_CLASSIFIER_PATH =
  'meta::flatData::metamodel::FlatData';

export class ESFlatData_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements DSLMapping_PureProtocolProcessorPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_FlatData>({
        elementClassName: FlatData.name,
        _class: V1_FlatData,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_FlatData);
          const element = new FlatData(elementProtocol.name);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnStore(path, element);
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_FlatData);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getOwnFlatDataStore(path, context.currentSubGraph);
          element.sections = elementProtocol.sections.map((section) =>
            V1_buildFlatDataSection(section, element, context),
          );
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_FlatData) {
          return FLAT_DATA_STORE_ELEMENT_CLASSIFIER_PATH;
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
        if (elementProtocol instanceof V1_FlatData) {
          return serialize(V1_flatDataModelSchema, elementProtocol);
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
        if (json._type === V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_flatDataModelSchema, json);
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
        if (metamodel instanceof FlatData) {
          return V1_transformFlatData(metamodel);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingFirstPassBuilders(): V1_ClassMappingFirstPassBuilder[] {
    return [
      (
        classMapping: V1_ClassMapping,
        context: V1_GraphBuilderContext,
        parent: Mapping,
      ): InstanceSetImplementation | undefined => {
        if (classMapping instanceof V1_RootFlatDataClassMapping) {
          assertNonEmptyString(
            classMapping.class,
            `Flat-data class mapping 'class' field is missing or empty`,
          );
          assertNonNullable(
            classMapping.root,
            `Flat-data class mapping 'root' field is missing`,
          );
          const targetClass = context.resolveClass(classMapping.class);
          const sourceRootRecordType = V1_resolveRootFlatDataRecordType(
            classMapping,
            context,
          );
          const flatDataInstanceSetImplementation =
            new FlatDataInstanceSetImplementation(
              V1_getInferredClassMappingId(targetClass.value, classMapping),
              parent,
              targetClass,
              InferableMappingElementRootExplicitValue.create(
                classMapping.root,
              ),
              sourceRootRecordType,
            );
          flatDataInstanceSetImplementation.filter = classMapping.filter
            ? V1_buildRawLambdaWithResolvedPaths(
                [],
                classMapping.filter.body,
                context,
              )
            : undefined;
          return flatDataInstanceSetImplementation;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingSecondPassBuilders(): V1_ClassMappingSecondPassBuilder[] {
    return [
      (
        classMapping: V1_ClassMapping,
        context: V1_GraphBuilderContext,
        parent: Mapping,
      ): void => {
        if (classMapping instanceof V1_RootFlatDataClassMapping) {
          assertNonEmptyString(
            classMapping.class,
            `Flat-data class mapping 'class' field is missing or empty`,
          );
          const flatDataInstanceSetImplementation = guaranteeType(
            getOwnClassMappingById(
              parent,
              V1_getInferredClassMappingId(
                context.resolveClass(classMapping.class).value,
                classMapping,
              ).value,
            ),
            FlatDataInstanceSetImplementation,
          );
          if (classMapping.extendsClassMappingId) {
            flatDataInstanceSetImplementation.superSetImplementationId =
              classMapping.extendsClassMappingId;
          }
          flatDataInstanceSetImplementation.propertyMappings =
            classMapping.propertyMappings.map((propertyMapping) =>
              propertyMapping.accept_PropertyMappingVisitor(
                new V1_ProtocolToMetaModelPropertyMappingBuilder(
                  context,
                  flatDataInstanceSetImplementation,
                  flatDataInstanceSetImplementation,
                  getAllEnumerationMappings(parent),
                ),
              ),
            ) as AbstractFlatDataPropertyMapping[];
        }
      },
    ];
  }

  V1_getExtraClassMappingSerializers(): V1_ClassMappingSerializer[] {
    return [
      (value: V1_ClassMapping): V1_ClassMapping | undefined => {
        if (value instanceof V1_RootFlatDataClassMapping) {
          return serialize(V1_rootFlatDataClassMappingModelSchema, value);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingDeserializers(): V1_ClassMappingDeserializer[] {
    return [
      (json: PlainObject<V1_ClassMapping>): V1_ClassMapping | undefined => {
        if (json._type === V1_FLAT_DATA_CLASS_MAPPING_PROTOCOL_TYPE) {
          return deserialize(V1_rootFlatDataClassMappingModelSchema, json);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingTransformers(): V1_ClassMappingTransformer[] {
    return [
      (
        setImplementation: InstanceSetImplementation,
        context: V1_GraphTransformerContext,
      ): V1_ClassMapping | undefined => {
        if (setImplementation instanceof FlatDataInstanceSetImplementation) {
          return V1_transformFlatDataInstanceSetImpl(
            setImplementation,
            context,
          );
        }
        return undefined;
      },
    ];
  }

  V1_getExtraPropertyMappingBuilders(): V1_PropertyMappingBuilder[] {
    return [
      (
        propertyMapping: V1_PropertyMapping,
        context: V1_GraphBuilderContext,
        topParent: InstanceSetImplementation | undefined,
        immediateParent: PropertyMappingsImplementation,
        allEnumerationMappings: EnumerationMapping[],
      ): PropertyMapping | undefined => {
        if (propertyMapping instanceof V1_FlatDataPropertyMapping) {
          assertNonNullable(
            propertyMapping.property,
            `Flat-data property mapping 'property' field is missing`,
          );
          assertNonEmptyString(
            propertyMapping.property.property,
            `Flat-data property mapping 'property.property' field is missing or empty`,
          );
          assertNonNullable(
            propertyMapping.transform,
            `Flat-data property mapping 'transform' field is missing`,
          );
          // NOTE: there are cases that property pointer class might be missing, such as when we transform grammar to JSON
          // since we do not do look up, due to nesting structure introudced by embedded mappings, we might not have the class information
          // as such, here we have to resolve the class being mapped depending on where the property mapping is in the class mapping
          let propertyOwnerClass: Class;
          if (propertyMapping.property.class) {
            propertyOwnerClass = context.resolveClass(
              propertyMapping.property.class,
            ).value;
          } else if (
            immediateParent instanceof EmbeddedFlatDataPropertyMapping
          ) {
            propertyOwnerClass = immediateParent.class.value;
          } else {
            throw new GraphBuilderError(
              `Can't find property owner class for property '${propertyMapping.property.property}'`,
            );
          }
          // NOTE: mapping for derived property is not supported
          const property = getClassProperty(
            propertyOwnerClass,
            propertyMapping.property.property,
          );
          const sourceSetImplementation = guaranteeNonNullable(
            immediateParent instanceof EmbeddedFlatDataPropertyMapping
              ? immediateParent
              : topParent,
          );
          // target
          let targetSetImplementation: SetImplementation | undefined;
          const propertyType = property.genericType.value.rawType;
          if (propertyType instanceof Class && propertyMapping.target) {
            targetSetImplementation = topParent
              ? V1_TEMPORARY__getClassMappingByIdOrReturnUnresolved(
                  topParent._PARENT,
                  propertyMapping.target,
                )
              : undefined;
          }
          const flatDataPropertyMapping = new FlatDataPropertyMapping(
            immediateParent,
            PropertyImplicitReference.create(
              PackageableElementImplicitReference.create(
                propertyOwnerClass,
                propertyMapping.property.class ?? '',
              ),
              property,
            ),
            V1_buildRawLambdaWithResolvedPaths(
              [],
              propertyMapping.transform.body,
              context,
            ),
            sourceSetImplementation,
            targetSetImplementation,
          );
          if (propertyMapping.enumMappingId) {
            const enumerationMapping = allEnumerationMappings.find(
              (em) => em.id.value === propertyMapping.enumMappingId,
            );
            if (!enumerationMapping) {
              // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
              context.log.debug(
                LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
                `Can't find enumeration mapping with ID '${propertyMapping.enumMappingId}' in mapping '${topParent?._PARENT.path} (perhaps because we haven't supported included mappings)`,
              );
            }
            flatDataPropertyMapping.transformer =
              OptionalEnumerationMappingExplicitReference.create(
                enumerationMapping,
              );
          }
          return flatDataPropertyMapping;
        } else if (
          propertyMapping instanceof V1_EmbeddedFlatDataPropertyMapping
        ) {
          assertNonNullable(
            propertyMapping.property,
            `Embedded flat-data property mapping 'property' field is missing`,
          );
          assertNonEmptyString(
            propertyMapping.property.property,
            `Embedded flat-data property mapping property 'property.property' field is missing or empty`,
          );
          // NOTE: there are cases that property pointer class might be missing, such as when we transform grammar to JSON
          // since we do not do look up, due to nesting structure introudced by embedded mappings, we might not have the class information
          // as such, here we have to resolve the class being mapped depending on where the property mapping is in the class mapping
          let propertyOwnerClass: Class;
          if (propertyMapping.property.class) {
            propertyOwnerClass = context.resolveClass(
              propertyMapping.property.class,
            ).value;
          } else if (
            immediateParent instanceof EmbeddedFlatDataPropertyMapping
          ) {
            propertyOwnerClass = immediateParent.class.value;
          } else {
            throw new GraphBuilderError(
              `Can't find property owner class for property '${propertyMapping.property.property}'`,
            );
          }
          const property = getClassProperty(
            propertyOwnerClass,
            propertyMapping.property.property,
          );
          let _class: PackageableElementReference<Class>;
          if (propertyMapping.class) {
            _class = context.resolveClass(propertyMapping.class);
          } else {
            const propertyType = property.genericType.value.rawType;
            const complexClass = guaranteeType(
              propertyType,
              Class,
              'Only complex classes can be the target of an embedded property mapping',
            );
            _class = PackageableElementImplicitReference.create(
              complexClass,
              '',
            );
          }
          const sourceSetImplementation = guaranteeNonNullable(
            immediateParent instanceof EmbeddedFlatDataPropertyMapping
              ? immediateParent
              : topParent,
          );
          const embeddedPropertyMapping = new EmbeddedFlatDataPropertyMapping(
            immediateParent,
            PropertyImplicitReference.create(
              PackageableElementImplicitReference.create(
                propertyOwnerClass,
                propertyMapping.property.class ?? '',
              ),
              property,
            ),
            guaranteeNonNullable(topParent),
            sourceSetImplementation,
            _class,
            InferableMappingElementIdExplicitValue.create(
              `${sourceSetImplementation.id.value}.${property.name}`,
              '',
            ),
            undefined,
          );
          embeddedPropertyMapping.targetSetImplementation =
            embeddedPropertyMapping;
          embeddedPropertyMapping.propertyMappings =
            propertyMapping.propertyMappings.map((pm) =>
              pm.accept_PropertyMappingVisitor(
                new V1_ProtocolToMetaModelPropertyMappingBuilder(
                  context,
                  embeddedPropertyMapping,
                  topParent,
                  allEnumerationMappings,
                ),
              ),
            );
          return embeddedPropertyMapping;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraPropertyMappingTransformers(): V1_PropertyMappingTransformer[] {
    return [
      (
        metamodel: PropertyMapping,
        context: V1_GraphTransformerContext,
      ): V1_PropertyMapping | undefined => {
        if (metamodel instanceof FlatDataPropertyMapping) {
          return V1_transformSimpleFlatDataPropertyMapping(metamodel, context);
        } else if (metamodel instanceof EmbeddedFlatDataPropertyMapping) {
          return V1_transformEmbeddedFlatDataPropertyMapping(
            metamodel,
            context,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraPropertyMappingTransformationExcludabilityCheckers(): PropertyMappingTransformationExcludabilityChecker[] {
    return [
      (propertyMapping: PropertyMapping): boolean | undefined => {
        if (propertyMapping instanceof FlatDataPropertyMapping) {
          return !isStubbed_RawLambda(propertyMapping.transform);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraMappingTestInputDataBuilders(): V1_MappingTestInputDataBuilder[] {
    return [
      (
        inputData: V1_InputData,
        context: V1_GraphBuilderContext,
      ): InputData | undefined => {
        if (inputData instanceof V1_FlatDataInputData) {
          assertNonNullable(
            inputData.sourceFlatData,
            `Flat-data input data 'sourceFlatData' field is missing`,
          );
          assertNonNullable(
            inputData.data,
            `Flat-data input data 'data' field is missing`,
          );
          return new FlatDataInputData(
            V1_resolveFlatDataStore(inputData.sourceFlatData.path, context),
            inputData.data,
          );
        }
        return undefined;
      },
    ];
  }

  V1_getExtraMappingTestInputDataTransformers(): V1_MappingTestInputDataTransformer[] {
    return [
      (
        metamodel: InputData,
        context: V1_GraphTransformerContext,
      ): V1_InputData | undefined => {
        if (metamodel instanceof FlatDataInputData) {
          return V1_transformFlatDataInputData(metamodel);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraMappingTestInputDataSerializers(): V1_MappingTestInputDataSerializer[] {
    return [
      (value: V1_InputData): PlainObject<V1_InputData> | undefined => {
        if (value instanceof V1_FlatDataInputData) {
          return serialize(V1_flatDataInputData, value);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraMappingTestInputDataDeserializers(): V1_MappingTestInputDataDeserializer[] {
    return [
      (json: PlainObject<V1_InputData>): V1_InputData | undefined => {
        if (json._type === V1_FLAT_DATA_INPUT_DATA_PROTOCOL_TYPE) {
          return deserialize(V1_flatDataInputData, json);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionBuilders(): V1_ConnectionBuilder[] {
    return [
      (
        connection: V1_Connection,
        context: V1_GraphBuilderContext,
        store?: PackageableElementReference<Store> | undefined,
      ): Connection | undefined => {
        if (connection instanceof V1_FlatDataConnection) {
          const flatDataStore = !store
            ? V1_resolveFlatDataStore(
                guaranteeNonNullable(
                  connection.store,
                  `Flat-data connection 'store' field is missing`,
                ),
                context,
              )
            : connection.store
            ? V1_resolveFlatDataStore(connection.store, context)
            : ((): PackageableElementReference<FlatData> => {
                assertType(
                  store.value,
                  FlatData,
                  `Flat-data connection store must be a flat-data store`,
                );
                return store as PackageableElementReference<FlatData>;
              })();
          assertNonNullable(
            connection.url,
            `Flat-data connection 'url' field is missing`,
          );
          return new FlatDataConnection(flatDataStore, connection.url);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionTransformers(): V1_ConnectionTransformer[] {
    return [
      (
        metamodel: Connection,
        context: V1_GraphTransformerContext,
      ): V1_Connection | undefined => {
        if (metamodel instanceof FlatDataConnection) {
          const connection = new V1_FlatDataConnection();
          connection.store = metamodel.store.valueForSerialization ?? '';
          connection.url = metamodel.url;
          return connection;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionProtocolSerializers(): V1_ConnectionProtocolSerializer[] {
    return [
      (
        connectionProtocol: V1_Connection,
      ): PlainObject<V1_Connection> | undefined => {
        if (connectionProtocol instanceof V1_FlatDataConnection) {
          return serialize(
            V1_flatDataConnectionModelSchema,
            connectionProtocol,
          );
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionProtocolDeserializers(): V1_ConnectionProtocolDeserializer[] {
    return [
      (json: PlainObject<V1_Connection>): V1_Connection | undefined => {
        if (json._type === V1_FLAT_DATA_CONNECTION_PROTOCOL_TYPE) {
          return deserialize(V1_flatDataConnectionModelSchema, json);
        }
        return undefined;
      },
    ];
  }
}
