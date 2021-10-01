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
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { deserialize, map, object, serialize } from 'serializr';
import {
  V1_serviceStoreModelSchema,
  V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE,
  V1_rootServiceStoreClassMappingModelSchema,
  V1_SERVICE_STORE_MAPPING_PROTOCOL_TYPE,
  V1_serviceStoreConnectionModelSchema,
  V1_SERVICE_STORE_CONNECTION_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_DSLServiceStore_ProtocolHelper';
import { getServiceStore } from '../../../graphManager/DSLServiceStore_GraphManagerHelper';
import { ServiceStore } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStore';
import type { ServiceStoreElement } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStoreElement';
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
} from '@finos/legend-graph';
import {
  DSLMapping_PureProtocolProcessorPlugin_Extension,
  fromElementPathToMappingElementId,
  getClassMappingById,
  InferableMappingElementIdImplicitValue,
  InferableMappingElementRootExplicitValue,
  RawLambda,
  V1_ElementBuilder,
  V1_initPackageableElement,
  V1_RawLambda,
  V1_transformElementReference,
} from '@finos/legend-graph';
import type { V1_ServiceStoreElement } from './v1/model/packageableElements/store/serviceStore/model/V1_ServiceStoreElement';
import {
  Service,
  HTTP_METHOD,
} from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/Service';
import { ServiceGroup } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceGroup';
import { V1_Service } from './v1/model/packageableElements/store/serviceStore/model/V1_Service';
import { V1_ServiceGroup } from './v1/model/packageableElements/store/serviceStore/model/V1_ServiceGroup';
import { StringTypeReference } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/StringTypeReference';
import { V1_StringTypeReference } from './v1/model/packageableElements/store/serviceStore/model/V1_StringTypeReference';
import { V1_BooleanTypeReference } from './v1/model/packageableElements/store/serviceStore/model/V1_BooleanTypeReference';
import { BooleanTypeReference } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/BooleanTypeReference';
import { FloatTypeReference } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/FloatTypeReference';
import { V1_FloatTypeReference } from './v1/model/packageableElements/store/serviceStore/model/V1_FloatTypeReference';
import { IntegerTypeReference } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/IntegerTypeReference';
import { V1_IntegerTypeReference } from './v1/model/packageableElements/store/serviceStore/model/V1_IntegerTypeReference';
import { ComplexTypeReference } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/ComplexTypeReference';
import { V1_ComplexTypeReference } from './v1/model/packageableElements/store/serviceStore/model/V1_ComplexTypeReference';
import type { TypeReference } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/TypeReference';
import type { V1_TypeReference } from './v1/model/packageableElements/store/serviceStore/model/V1_TypeReference';
import {
  ServiceParameter,
  LOCATION,
} from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceParameter';
import { V1_ServiceParameter } from './v1/model/packageableElements/store/serviceStore/model/V1_ServiceParameter';
import { V1_RootServiceStoreClassMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_RootServiceStoreClassMapping';
import { RootServiceInstanceSetImplementation } from '../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/RootServiceInstanceSetImplementation';
import { LocalMappingProperty } from '../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/LocalMappingProperty';
import { ServiceMapping } from '../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/ServiceMapping';
import { V1_ServiceStoreConnection } from './v1/model/packageableElements/store/serviceStore/connection/V1_ServicestoreConnection';
import {
  V1_resolveService,
  V1_resolveServiceStore,
} from './v1/transformation/pureGraph/V1_DSLServiceStore_GraphBuilderHelper';
import { ServiceStoreConnection } from '../../metamodels/pure/model/packageableElements/store/serviceStore/connection/ServiceStoreConnection';
import { ServiceParameterMapping } from '../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/ServiceParameterMapping';
import { ServicePtr } from '../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServicePtr';
import { V1_ServiceMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_ServiceMapping';
import type { V1_ServiceParameterMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_ServiceParameterMapping';
import { V1_ServicePtr } from './v1/model/packageableElements/store/serviceStore/model/V1_ServicePtr';
import { V1_ParameterIndexedParameterMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_ParameterIndexedParameterMapping';
import { V1_PropertyIndexedParameterMapping } from './v1/model/packageableElements/store/serviceStore/mapping/V1_PropertyIndexedParameterMapping';
import { V1_ServiceGroupPtr } from './v1/model/packageableElements/store/serviceStore/model/V1_ServiceGroupPtr';

const SERVICE_STORE_ELEMENT_CLASSIFIER_PATH =
  'meta::external::store::service::metamodel::ServiceStore';

const V1_buildTypeReference = (protocol: V1_TypeReference): TypeReference => {
  if (protocol instanceof V1_BooleanTypeReference) {
    const booleanTypeReference = new BooleanTypeReference(protocol.list);
    return booleanTypeReference;
  } else if (protocol instanceof V1_ComplexTypeReference) {
    const complexTypeReference = new ComplexTypeReference(protocol.list);
    complexTypeReference.type = protocol.type;
    complexTypeReference.binding = protocol.binding;
    return complexTypeReference;
  } else if (protocol instanceof V1_FloatTypeReference) {
    const floatTypeReference = new FloatTypeReference(protocol.list);
    return floatTypeReference;
  } else if (protocol instanceof V1_IntegerTypeReference) {
    const integerTypeReference = new IntegerTypeReference(protocol.list);
    return integerTypeReference;
  }
  if (protocol instanceof V1_StringTypeReference) {
    const stringTypeReference = new StringTypeReference(protocol.list);
    return stringTypeReference;
  }
  throw new UnsupportedOperationError(
    `Can't build type reference: no compatible builder available from plugins`,
    protocol,
  );
};

const V1_buildServiceParameter = (
  protocol: V1_ServiceParameter,
): ServiceParameter => {
  const serviceParameter = new ServiceParameter();
  serviceParameter.name = protocol.name;
  if (protocol.type !== undefined) {
    serviceParameter.type = V1_buildTypeReference(protocol.type);
  }
  serviceParameter.location =
    Object.values(LOCATION).find((type) => type === protocol.location) ??
    LOCATION.PATH;
  serviceParameter.enumeration = protocol.enumeration;
  serviceParameter.serializationFormat = protocol.serializationFormat;
  return serviceParameter;
};

const V1_buildServiceParameterMapping = (
  protocol: V1_ServiceParameterMapping,
  service: Service,
): ServiceParameterMapping => {
  if (protocol instanceof V1_ParameterIndexedParameterMapping) {
    const mapping = new ServiceParameterMapping();
    mapping.type = 'parameter';
    mapping.serviceParameter = service.getParameter(protocol.serviceParameter);
    const lambda = new RawLambda(
      protocol.transform.parameters,
      protocol.transform.body,
    );
    mapping.transform = lambda;
    return mapping;
  } else if (protocol instanceof V1_PropertyIndexedParameterMapping) {
    const mapping = new ServiceParameterMapping();
    mapping.type = 'property';
    mapping.serviceParameter = service.getParameter(protocol.serviceParameter);
    const lambda = new RawLambda(object, object);
    mapping.transform = lambda;
    return mapping;
  }
  throw new UnsupportedOperationError(
    `Can't build service parameter mapping: no compatible builder available from plugins`,
    protocol,
  );
};

const V1_buildServiceStoreElement = (
  protocol: V1_ServiceStoreElement,
  owner: ServiceStore,
  parent?: ServiceGroup | undefined,
): ServiceStoreElement => {
  if (protocol instanceof V1_Service) {
    const service = new Service(protocol.id, protocol.path, owner, parent);
    if (protocol.requestBody !== undefined) {
      service.requestBody = V1_buildTypeReference(protocol.requestBody);
    }
    service.method =
      Object.values(HTTP_METHOD).find((type) => type === protocol.method) ??
      HTTP_METHOD.POST;
    service.parameters = protocol.parameters.map((parameter) =>
      V1_buildServiceParameter(parameter),
    );
    service.response = new ComplexTypeReference(protocol.response.list);
    service.response.type = protocol.response.type;
    service.response.binding = protocol.response.binding;
    service.security = protocol.security;
    return service;
  } else if (protocol instanceof V1_ServiceGroup) {
    const serviceGroup = new ServiceGroup(
      protocol.id,
      protocol.path,
      owner,
      parent,
    );
    serviceGroup.elements = protocol.elements.map((element) =>
      V1_buildServiceStoreElement(element, owner, serviceGroup),
    );
    return serviceGroup;
  }
  throw new UnsupportedOperationError(
    `Can't build service store element: no compatible builder available from plugins`,
    protocol,
  );
};

const transformStringTypeReference = (
  metamodel: StringTypeReference,
): V1_StringTypeReference => {
  const stringTypeReference = new V1_StringTypeReference();
  stringTypeReference.list = metamodel.list;
  return stringTypeReference;
};

const transformBooleanTypeReference = (
  metamodel: BooleanTypeReference,
): V1_BooleanTypeReference => {
  const booleanTypeReference = new V1_BooleanTypeReference();
  booleanTypeReference.list = metamodel.list;
  return booleanTypeReference;
};

const transformFloatTypeReference = (
  metamodel: FloatTypeReference,
): V1_FloatTypeReference => {
  const floatTypeReference = new V1_FloatTypeReference();
  floatTypeReference.list = metamodel.list;
  return floatTypeReference;
};

const transformIntegerTypeReference = (
  metamodel: IntegerTypeReference,
): V1_IntegerTypeReference => {
  const integerTypeReference = new V1_IntegerTypeReference();
  integerTypeReference.list = metamodel.list;
  return integerTypeReference;
};

const transformComplexTypeReference = (
  metamodel: ComplexTypeReference,
): V1_ComplexTypeReference => {
  const complexTypeReference = new V1_ComplexTypeReference();
  complexTypeReference.list = metamodel.list;
  complexTypeReference.type = metamodel.type;
  complexTypeReference.binding = metamodel.binding;
  return complexTypeReference;
};

const transformTypeReference = (metamodel: TypeReference): V1_TypeReference => {
  if (metamodel instanceof BooleanTypeReference) {
    return transformBooleanTypeReference(metamodel);
  } else if (metamodel instanceof ComplexTypeReference) {
    return transformComplexTypeReference(metamodel);
  } else if (metamodel instanceof FloatTypeReference) {
    return transformFloatTypeReference(metamodel);
  } else if (metamodel instanceof IntegerTypeReference) {
    return transformIntegerTypeReference(metamodel);
  } else if (metamodel instanceof StringTypeReference) {
    return transformStringTypeReference(metamodel);
  }
  throw new UnsupportedOperationError(
    `Can't transform type reference: no compatible transformer available from plugins`,
    metamodel,
  );
};

const transformServiceParameterMapping = (
  metamodel: ServiceParameterMapping,
): V1_ServiceParameterMapping => {
  if (metamodel.type === 'parameter') {
    const mapping = new V1_ParameterIndexedParameterMapping();
    mapping.serviceParameter = metamodel.serviceParameter.name;
    const lambda = new V1_RawLambda();
    lambda.parameters = metamodel.transform.parameters;
    lambda.body = metamodel.transform.body;
    mapping.transform = lambda;
    return mapping;
  } else if (metamodel.type === 'property') {
    const mapping = new V1_PropertyIndexedParameterMapping();
    mapping.serviceParameter = metamodel.serviceParameter.name;
    mapping.property = '';
    return mapping;
  }
  throw new UnsupportedOperationError(
    `Can't transform service parameter mapping: no compatible transformer available from plugins`,
    metamodel,
  );
};

const transformServiceParameter = (
  metamodel: ServiceParameter,
): V1_ServiceParameter => {
  const serviceParameter = new V1_ServiceParameter();
  serviceParameter.name = metamodel.name;
  if (metamodel.type !== undefined) {
    serviceParameter.type = transformTypeReference(metamodel.type);
  }
  serviceParameter.location = metamodel.location;
  serviceParameter.enumeration = metamodel.enumeration;
  serviceParameter.serializationFormat = metamodel.serializationFormat;
  return serviceParameter;
};

const transformService = (metamodel: Service): V1_Service => {
  const service = new V1_Service();
  service.id = metamodel.id;
  service.path = metamodel.path;
  if (metamodel.requestBody !== undefined) {
    service.requestBody = transformTypeReference(metamodel.requestBody);
  }
  service.method = metamodel.method;
  service.parameters = metamodel.parameters.map((parameter) =>
    transformServiceParameter(parameter),
  );
  service.response = transformComplexTypeReference(metamodel.response);
  return service;
};

const transformServiceGroup = (metamodel: ServiceGroup): V1_ServiceGroup => {
  const serviceGroup = new V1_ServiceGroup();
  serviceGroup.id = metamodel.id;
  serviceGroup.path = metamodel.path;
  serviceGroup.elements = metamodel.elements.map((element) =>
    transformServiceStoreElement(element),
  );
  return serviceGroup;
};

const transformServiceToServiceGroupPtr = (
  metamodel: ServiceGroup,
): V1_ServiceGroupPtr => {
  const serviceGroup = new V1_ServiceGroupPtr();
  serviceGroup.serviceGroup = metamodel.id;
  serviceGroup.serviceStore = metamodel.owner.path;
  if (metamodel.parent !== undefined) {
    serviceGroup.parent = transformServiceToServiceGroupPtr(metamodel.parent);
  }
  return serviceGroup;
};

const transformServiceToServicePtr = (metamodel: Service): V1_ServicePtr => {
  const service = new V1_ServicePtr();
  service.service = metamodel.id;
  service.serviceStore = metamodel.owner.path;
  if (metamodel.parent !== undefined) {
    service.parent = transformServiceToServiceGroupPtr(metamodel.parent);
  }
  return service;
};

const transformServiceStoreElement = (
  metamodel: ServiceStoreElement,
): V1_ServiceStoreElement => {
  if (metamodel instanceof Service) {
    return transformService(metamodel);
  } else if (metamodel instanceof ServiceGroup) {
    return transformServiceGroup(metamodel);
  }
  throw new UnsupportedOperationError(
    `Can't transform service store element: no compatible transformer available from plugins`,
    metamodel,
  );
};

export class DSLServiceStore_PureProtocolProcessorPlugin extends DSLMapping_PureProtocolProcessorPlugin_Extension {
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
              V1_buildServiceStoreElement(serviceStoreElement, element),
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
          return serialize(V1_serviceStoreModelSchema, elementProtocol);
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
          return deserialize(V1_serviceStoreModelSchema, json);
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
            transformServiceStoreElement(element),
          );
          return protocol;
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraClassMappingFirstPassBuilders(): V1_ClassMappingFirstPassBuilder[] {
    return [
      (
        classMapping: V1_ClassMapping,
        context: V1_GraphBuilderContext,
        parent: Mapping,
      ): InstanceSetImplementation | undefined => {
        if (classMapping instanceof V1_RootServiceStoreClassMapping) {
          assertNonEmptyString(
            classMapping.class,
            'ServiceStore class mapping class is missing',
          );
          /*assertNonNullable(
            classMapping.root,
            'ServiceStore class mapping root flag is missing',
          );*/
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
            classMapping.localMappingProperties;
          rootServiceInstanceSetImplementation.servicesMapping =
            classMapping.servicesMapping.map((serviceMapping) => {
              const mapping = new ServiceMapping(
                rootServiceInstanceSetImplementation,
              );
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

  override V1_getExtraClassMappingSecondPassBuilders(): V1_ClassMappingSecondPassBuilder[] {
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
              property.multiplicity = localMappingProperty.multiplicity;
              return property;
            });
          rootServiceInstanceSetImplementation.servicesMapping =
            classMapping.servicesMapping.map((serviceMapping) => {
              const mapping = new ServiceMapping(
                rootServiceInstanceSetImplementation,
              );
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

  override V1_getExtraClassMappingValueSerializers(): V1_ClassMappingValueSerializer[] {
    return [
      (value: V1_ClassMapping): V1_ClassMapping | undefined => {
        if (value instanceof V1_RootServiceStoreClassMapping) {
          return serialize(V1_rootServiceStoreClassMappingModelSchema, value);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraClassMappingValueDeserializers(): V1_ClassMappingValueDeserializer[] {
    return [
      (json: PlainObject<V1_ClassMapping>): V1_ClassMapping | undefined => {
        if (json._type === V1_SERVICE_STORE_MAPPING_PROTOCOL_TYPE) {
          return deserialize(V1_rootServiceStoreClassMappingModelSchema, json);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraClassMappingTransformers(): V1_ClassMappingTransformer[] {
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
          classMapping.localMappingProperties =
            setImplementation.localMappingProperties;
          classMapping.servicesMapping = setImplementation.servicesMapping.map(
            (serviceMapping) => {
              const mapping = new V1_ServiceMapping();
              mapping.service = transformServiceToServicePtr(
                serviceMapping.service,
              );
              mapping.parameterMappings = serviceMapping.parameterMappings.map(
                (parameter) => {
                  const parameterMapping =
                    transformServiceParameterMapping(parameter);
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

  override V1_getExtraConnectionBuilders(): V1_ConnectionBuilder[] {
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
                  'ServiceStore is missing',
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

  override V1_getExtraConnectionTransformers(): V1_ConnectionTransformer[] {
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

  override V1_getExtraConnectionProtocolSerializers(): V1_ConnectionProtocolSerializer[] {
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

  override V1_getExtraConnectionProtocolDeserializers(): V1_ConnectionProtocolDeserializer[] {
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
