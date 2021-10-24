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
import { V1_ServiceStore } from './v1/model/packageableElements/store/serviceStore/model/V1_ServiceStore';
import type { PlainObject } from '@finos/legend-shared';
import {
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
} from './v1/transformation/pureProtocol/V1_ESService_ProtocolHelper';
import { getServiceStore } from '../../../graphManager/ESService_GraphManagerHelper';
import { ServiceStore } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStore';
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
  V1_ClassMapping,
  V1_ClassMappingFirstPassBuilder,
  V1_ClassMappingSecondPassBuilder,
  V1_ClassMappingTransformer,
  V1_ClassMappingValueDeserializer,
  V1_ClassMappingValueSerializer,
  Mapping,
  InstanceSetImplementation,
  Connection,
  PackageableElementReference,
  Store,
  V1_Connection,
  V1_ConnectionBuilder,
  V1_ConnectionProtocolDeserializer,
  V1_ConnectionProtocolSerializer,
  V1_ConnectionTransformer,
  DSLMapping_PureProtocolProcessorPlugin_Extension,
} from '@finos/legend-graph';
import {
  PureProtocolProcessorPlugin,
  fromElementPathToMappingElementId,
  getClassMappingById,
  InferableMappingElementIdImplicitValue,
  InferableMappingElementRootExplicitValue,
  Multiplicity,
  V1_ElementBuilder,
  V1_initPackageableElement,
  V1_transformElementReference,
} from '@finos/legend-graph';
import { V1_RootServiceStoreClassMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_RootServiceStoreClassMapping';
import { RootServiceInstanceSetImplementation } from '../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/RootServiceInstanceSetImplementation';
import { LocalMappingProperty } from '../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/LocalMappingProperty';
import { ServiceMapping } from '../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/ServiceMapping';
import { V1_ServiceStoreConnection } from './v1/model/packageableElements/store/serviceStore/connection/V1_ServicestoreConnection';
import {
  V1_buildServiceParameterMapping,
  V1_buildServiceStoreElement,
  V1_resolveService,
  V1_resolveServiceStore,
} from './v1/transformation/pureGraph/V1_ESService_GraphBuilderHelper';
import { ServiceStoreConnection } from '../../metamodels/pure/model/packageableElements/store/serviceStore/connection/ServiceStoreConnection';
import { V1_ServiceMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_ServiceMapping';
import {
  V1_transformServiceParameterMapping,
  V1_transformServiceStoreElement,
  V1_transformServiceToServicePtr,
} from './v1/transformation/pureGraph/V1_ESService_TransformerHelper';

const SERVICE_STORE_ELEMENT_CLASSIFIER_PATH =
  'meta::external::store::service::metamodel::ServiceStore';

export class ESService_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements DSLMapping_PureProtocolProcessorPlugin_Extension
{
  plugins: PureProtocolProcessorPlugin[] = [];
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  install(pluginManager: GraphPluginManager): void {
    pluginManager.registerPureProtocolProcessorPlugin(this);
    this.plugins = pluginManager.getPureProtocolProcessorPlugins();
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
          const path = context.currentSubGraph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph
            .getOrCreatePackage(elementProtocol.package)
            .addElement(element);
          context.currentSubGraph.setOwnStore(path, element);
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_ServiceStore);
          const path = context.graph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getServiceStore(path, context.graph);
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
      ): PlainObject<V1_PackageableElement> | undefined => {
        if (elementProtocol instanceof V1_ServiceStore) {
          return serialize(
            V1_serviceStoreModelSchema(this.plugins),
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
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_serviceStoreModelSchema(this.plugins), json);
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
          protocol.package = metamodel.package?.fullPath ?? '';
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
              const multiplicity = new Multiplicity(
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
              mapping.parameterMappings = serviceMapping.parameterMappings.map(
                (parameter) => {
                  const parameterMapping = V1_buildServiceParameterMapping(
                    parameter,
                    mapping.service,
                  );
                  return parameterMapping;
                },
              );
              return mapping;
            });
          return rootServiceInstanceSetImplementation;
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
        if (classMapping instanceof V1_RootServiceStoreClassMapping) {
          assertNonEmptyString(
            classMapping.class,
            'ServiceStore class mapping class is missing',
          );
          const id = InferableMappingElementIdImplicitValue.create(
            classMapping.id ??
              fromElementPathToMappingElementId(
                context.resolveClass(classMapping.class).value.path,
              ),
            context.resolveClass(classMapping.class).value.path,
            classMapping.id,
          ).value;
          const rootServiceInstanceSetImplementation = getClassMappingById(
            parent,
            id,
          );
          assertType(
            rootServiceInstanceSetImplementation,
            RootServiceInstanceSetImplementation,
            `Class mapping with ID '${id}' is not of type serviceStore set implementation`,
          );
          rootServiceInstanceSetImplementation.localMappingProperties =
            classMapping.localMappingProperties.map((localMappingProperty) => {
              const property = new LocalMappingProperty();
              property.name = localMappingProperty.name;
              property.type = localMappingProperty.type;
              const multiplicity = new Multiplicity(
                localMappingProperty.multiplicity.lowerBound,
                localMappingProperty.multiplicity.upperBound,
              );
              property.multiplicity = multiplicity;
              return property;
            });
          rootServiceInstanceSetImplementation.servicesMapping =
            classMapping.servicesMapping.map((serviceMapping) => {
              const mapping = new ServiceMapping();
              mapping.owner = rootServiceInstanceSetImplementation;
              mapping.service = V1_resolveService(
                serviceMapping.service,
                context,
              );
              mapping.parameterMappings = serviceMapping.parameterMappings.map(
                (parameter) => {
                  const parameterMapping = V1_buildServiceParameterMapping(
                    parameter,
                    mapping.service,
                  );
                  return parameterMapping;
                },
              );
              return mapping;
            });
        }
      },
    ];
  }

  V1_getExtraClassMappingValueSerializers(): V1_ClassMappingValueSerializer[] {
    return [
      (value: V1_ClassMapping): V1_ClassMapping | undefined => {
        if (value instanceof V1_RootServiceStoreClassMapping) {
          return serialize(V1_rootServiceStoreClassMappingModelSchema, value);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingValueDeserializers(): V1_ClassMappingValueDeserializer[] {
    return [
      (json: PlainObject<V1_ClassMapping>): V1_ClassMapping | undefined => {
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
          classMapping.class = V1_transformElementReference(
            setImplementation.class,
          );
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
              mapping.parameterMappings = serviceMapping.parameterMappings.map(
                (parameter) => {
                  const parameterMapping =
                    V1_transformServiceParameterMapping(parameter);
                  return parameterMapping;
                },
              );
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
          connection.store = V1_transformElementReference(metamodel.store);
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
}
