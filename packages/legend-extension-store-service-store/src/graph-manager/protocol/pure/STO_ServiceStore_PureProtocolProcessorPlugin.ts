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

import packageJson from '../../../../package.json' with { type: 'json' };
import { V1_ServiceStore } from './v1/model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStore.js';
import {
  type PlainObject,
  assertNonEmptyString,
  assertNonNullable,
  assertType,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  V1_serviceStoreModelSchema,
  V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE,
  V1_rootServiceStoreClassMappingModelSchema,
  V1_SERVICE_STORE_MAPPING_PROTOCOL_TYPE,
  V1_serviceStoreConnectionModelSchema,
  V1_SERVICE_STORE_CONNECTION_PROTOCOL_TYPE,
  V1_serviceStoreEmbeddedDataModelSchema,
  V1_SERVICE_STORE_EMBEDDED_DATA_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_STO_ServiceStore_ProtocolHelper.js';
import { getOwnServiceStore } from '../../STO_ServiceStore_GraphManagerHelper.js';
import { ServiceStore } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStore.js';
import {
  type PackageableElement,
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
  type V1_PackageableElement,
  type V1_ClassMapping,
  type V1_ClassMappingFirstPassBuilder,
  type V1_ClassMappingTransformer,
  type V1_ClassMappingDeserializer,
  type V1_ClassMappingSerializer,
  type Mapping,
  type InstanceSetImplementation,
  type Connection,
  type PackageableElementReference,
  type Store,
  type V1_Connection,
  type V1_ConnectionBuilder,
  type V1_ConnectionProtocolDeserializer,
  type V1_ConnectionProtocolSerializer,
  type V1_ConnectionTransformer,
  type DSL_Mapping_PureProtocolProcessorPlugin_Extension,
  type DSL_Data_PureProtocolProcessorPlugin_Extension,
  type V1_EmbeddedDataBuilder,
  type V1_EmbeddedDataProtocolDeserializer,
  type V1_EmbeddedDataProtocolSerializer,
  type V1_EmbeddedDataTransformer,
  type EmbeddedData,
  type V1_EmbeddedData,
  PureProtocolProcessorPlugin,
  fromElementPathToMappingElementId,
  InferableMappingElementIdImplicitValue,
  InferableMappingElementRootExplicitValue,
  V1_ElementBuilder,
  V1_initPackageableElement,
  V1_buildFullPath,
} from '@finos/legend-graph';
import { V1_RootServiceStoreClassMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_RootServiceStoreClassMapping.js';
import { RootServiceInstanceSetImplementation } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_RootServiceInstanceSetImplementation.js';
import { LocalMappingProperty } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_LocalMappingProperty.js';
import { ServiceMapping } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceMapping.js';
import { V1_ServiceStoreConnection } from './v1/model/packageableElements/store/serviceStore/connection/V1_STO_ServiceStore_ServicestoreConnection.js';
import {
  V1_buildServiceRequestBuildInfo,
  V1_buildServiceStoreElement,
  V1_buildServiceStoreEmbeddedData,
  V1_resolveService,
  V1_resolveServiceStore,
} from './v1/transformation/pureGraph/V1_STO_ServiceStore_GraphBuilderHelper.js';
import { ServiceStoreConnection } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/connection/STO_ServiceStore_ServiceStoreConnection.js';
import { V1_ServiceMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceMapping.js';
import {
  V1_transformServiceRequestBuildInfo,
  V1_transformServiceStoreElement,
  V1_transformServiceStoreEmbeddedData,
  V1_transformServiceToServicePtr,
} from './v1/transformation/pureGraph/V1_STO_ServiceStore_TransformerHelper.js';
import { ServiceStoreEmbeddedData } from '../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStoreEmbeddedData.js';
import { V1_ServiceStoreEmbeddedData } from './v1/model/data/V1_STO_ServiceStore_ServiceStoreEmbeddedData.js';

const SERVICE_STORE_ELEMENT_CLASSIFIER_PATH =
  'meta::external::store::service::metamodel::ServiceStore';

export class STO_ServiceStore_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements
    DSL_Mapping_PureProtocolProcessorPlugin_Extension,
    DSL_Data_PureProtocolProcessorPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_ServiceStore>({
        elementClassName: ServiceStore.name,
        _class: V1_ServiceStore,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_ServiceStore);
          const element = new ServiceStore(elementProtocol.name);
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
          assertType(elementProtocol, V1_ServiceStore);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getOwnServiceStore(path, context.currentSubGraph);
          element.description = elementProtocol.description;
          element.elements = elementProtocol.elements.map(
            (serviceStoreElement) =>
              V1_buildServiceStoreElement(
                serviceStoreElement,
                element,
                context,
              ),
          );
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_ServiceStore) {
          return SERVICE_STORE_ELEMENT_CLASSIFIER_PATH;
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
        if (elementProtocol instanceof V1_ServiceStore) {
          return serialize(
            V1_serviceStoreModelSchema(plugins),
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
        if (json._type === V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_serviceStoreModelSchema(plugins), json);
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
        if (metamodel instanceof ServiceStore) {
          const protocol = new V1_ServiceStore();
          V1_initPackageableElement(protocol, metamodel);
          protocol.name = metamodel.name;
          protocol.package = metamodel.package?.path ?? '';
          protocol.description = metamodel.description;
          protocol.elements = metamodel.elements.map((element) =>
            V1_transformServiceStoreElement(element, context),
          );
          return protocol;
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
        if (classMapping instanceof V1_RootServiceStoreClassMapping) {
          assertNonEmptyString(
            classMapping.class,
            `Service store class mapping 'class' is missing`,
          );
          assertNonNullable(
            classMapping.root,
            `Service store class mapping 'root' field is missing`,
          );
          const targetClass = context.resolveClass(classMapping.class);
          const rootServiceInstanceSetImplementation =
            new RootServiceInstanceSetImplementation(
              InferableMappingElementIdImplicitValue.create(
                classMapping.id ??
                  fromElementPathToMappingElementId(targetClass.value.path),
                targetClass.value.path,
                classMapping.id,
              ),
              parent,
              targetClass,
              InferableMappingElementRootExplicitValue.create(
                classMapping.root,
              ),
            );
          rootServiceInstanceSetImplementation.localMappingProperties =
            classMapping.localMappingProperties.map((localMappingProperty) => {
              const mappingProperty = new LocalMappingProperty();
              mappingProperty.type = localMappingProperty.type;
              mappingProperty.name = localMappingProperty.name;
              const multiplicity = context.graph.getMultiplicity(
                localMappingProperty.multiplicity.lowerBound,
                localMappingProperty.multiplicity.upperBound,
              );
              mappingProperty.multiplicity = multiplicity;
              return mappingProperty;
            });
          rootServiceInstanceSetImplementation.servicesMapping =
            classMapping.servicesMapping.map((serviceMapping) => {
              const mapping = new ServiceMapping();
              mapping.owner = rootServiceInstanceSetImplementation;
              mapping.service = V1_resolveService(
                serviceMapping.service,
                context,
              );
              mapping.pathOffset = serviceMapping.pathOffset;
              if (serviceMapping.requestBuildInfo) {
                mapping.requestBuildInfo = V1_buildServiceRequestBuildInfo(
                  serviceMapping.requestBuildInfo,
                  mapping.service,
                  context,
                );
              }
              return mapping;
            });
          return rootServiceInstanceSetImplementation;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingSerializers(): V1_ClassMappingSerializer[] {
    return [
      (value) => {
        if (value instanceof V1_RootServiceStoreClassMapping) {
          return serialize(V1_rootServiceStoreClassMappingModelSchema, value);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingDeserializers(): V1_ClassMappingDeserializer[] {
    return [
      (json) => {
        if (json._type === V1_SERVICE_STORE_MAPPING_PROTOCOL_TYPE) {
          return deserialize(V1_rootServiceStoreClassMappingModelSchema, json);
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
        if (setImplementation instanceof RootServiceInstanceSetImplementation) {
          const classMapping = new V1_RootServiceStoreClassMapping();
          classMapping.class =
            setImplementation.class.valueForSerialization ?? '';
          classMapping.id = setImplementation.id.valueForSerialization;
          classMapping.root = setImplementation.root.valueForSerialization;
          classMapping.localMappingProperties =
            setImplementation.localMappingProperties;
          classMapping.servicesMapping = setImplementation.servicesMapping.map(
            (serviceMapping) => {
              const mapping = new V1_ServiceMapping();
              mapping.service = V1_transformServiceToServicePtr(
                serviceMapping.service,
              );
              mapping.pathOffset = serviceMapping.pathOffset;
              if (serviceMapping.requestBuildInfo) {
                mapping.requestBuildInfo = V1_transformServiceRequestBuildInfo(
                  serviceMapping.requestBuildInfo,
                );
              }
              return mapping;
            },
          );
          return classMapping;
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
        if (connection instanceof V1_ServiceStoreConnection) {
          const Store = !store
            ? V1_resolveServiceStore(
                guaranteeNonNullable(
                  connection.store,
                  `Service store connection 'store' field is missing`,
                ),
                context,
              )
            : connection.store
              ? V1_resolveServiceStore(connection.store, context)
              : ((): PackageableElementReference<ServiceStore> => {
                  assertType(
                    store.value,
                    ServiceStore,
                    'ServiceStore connection must have a ServiceStore as its store',
                  );
                  return store as PackageableElementReference<ServiceStore>;
                })();
          const serviceStoreConnection = new ServiceStoreConnection(Store);
          serviceStoreConnection.baseUrl = connection.baseUrl;
          return serviceStoreConnection;
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
        if (metamodel instanceof ServiceStoreConnection) {
          const connection = new V1_ServiceStoreConnection();
          connection.store = metamodel.store.valueForSerialization ?? '';
          connection.baseUrl = metamodel.baseUrl;
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
        if (connectionProtocol instanceof V1_ServiceStoreConnection) {
          return serialize(
            V1_serviceStoreConnectionModelSchema,
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
        if (json._type === V1_SERVICE_STORE_CONNECTION_PROTOCOL_TYPE) {
          return deserialize(V1_serviceStoreConnectionModelSchema, json);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraEmbeddedDataBuilders(): V1_EmbeddedDataBuilder[] {
    return [
      (
        embeddedData: V1_EmbeddedData,
        context: V1_GraphBuilderContext,
      ): EmbeddedData | undefined => {
        if (embeddedData instanceof V1_ServiceStoreEmbeddedData) {
          return V1_buildServiceStoreEmbeddedData(embeddedData, context);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraEmbeddedDataTransformers(): V1_EmbeddedDataTransformer[] {
    return [
      (
        metamodel: EmbeddedData,
        context: V1_GraphTransformerContext,
      ): V1_EmbeddedData | undefined => {
        if (metamodel instanceof ServiceStoreEmbeddedData) {
          return V1_transformServiceStoreEmbeddedData(metamodel);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraEmbeddedDataProtocolSerializers(): V1_EmbeddedDataProtocolSerializer[] {
    return [
      (
        embeddedDataProtocol: V1_EmbeddedData,
      ): PlainObject<V1_EmbeddedData> | undefined => {
        if (embeddedDataProtocol instanceof V1_ServiceStoreEmbeddedData) {
          return serialize(
            V1_serviceStoreEmbeddedDataModelSchema,
            embeddedDataProtocol,
          );
        }
        return undefined;
      },
    ];
  }

  V1_getExtraEmbeddedDataProtocolDeserializers(): V1_EmbeddedDataProtocolDeserializer[] {
    return [
      (json: PlainObject<V1_EmbeddedData>): V1_EmbeddedData | undefined => {
        if (json._type === V1_SERVICE_STORE_EMBEDDED_DATA_PROTOCOL_TYPE) {
          return deserialize(V1_serviceStoreEmbeddedDataModelSchema, json);
        }
        return undefined;
      },
    ];
  }
}
