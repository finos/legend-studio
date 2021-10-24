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

import { getServiceStore } from '../../../../../../graphManager/ESService_GraphManagerHelper';
import type { ServiceStore } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStore';
import type {
  PackageableElementImplicitReference,
  V1_GraphBuilderContext,
} from '@finos/legend-graph';
import type { V1_ServicePtr } from '../../model/packageableElements/store/serviceStore/model/V1_ServicePtr';
import {
  ServiceStoreService,
  HTTP_METHOD,
} from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStoreService';
import type { V1_ServiceGroupPtr } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceGroupPtr';
import { ServiceGroup } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceGroup';
import type { V1_TypeReference } from '../../model/packageableElements/store/serviceStore/model/V1_TypeReference';
import {
  V1_BooleanTypeReference,
  V1_ComplexTypeReference,
  V1_FloatTypeReference,
  V1_IntegerTypeReference,
  V1_StringTypeReference,
} from '../../model/packageableElements/store/serviceStore/model/V1_TypeReference';
import type { TypeReference } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/TypeReference';
import {
  BooleanTypeReference,
  ComplexTypeReference,
  FloatTypeReference,
  IntegerTypeReference,
  StringTypeReference,
} from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/TypeReference';
import { getBinding } from '@finos/legend-extension-dsl-serializer';
import {
  assertNonNullable,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { V1_ServiceParameter } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceParameter';
import {
  LOCATION,
  ServiceParameter,
} from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceParameter';
import type { V1_ServiceParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_ServiceParameterMapping';
import { ServiceParameterMapping } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/ServiceParameterMapping';
import { V1_ParameterIndexedParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_ParameterIndexedParameterMapping';
import { RawLambda, V1_AppliedProperty } from '@finos/legend-graph';
import { V1_PropertyIndexedParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_PropertyIndexedParameterMapping';
import { object } from 'serializr';
import type { V1_ServiceStoreElement } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceStoreElement';
import type { ServiceStoreElement } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStoreElement';
import { V1_ServiceStoreService } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceStoreService';
import { V1_ServiceGroup } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceGroup';
import type { SecurityScheme } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/SecurityScheme';
import type { V1_SecurityScheme } from '../../model/packageableElements/store/serviceStore/model/V1_SecurityScheme';
import type { SecurityScheme_PureProtocolPlugin_Extension } from '../../../SecurityScheme_PureProtocolPlugin_Extension';
import { SerializationFormat } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/SerializationFormat';
import type { V1_SerializationFormat } from '../../model/packageableElements/store/serviceStore/model/V1_SerializationFormat';

const getService = (
  elements: ServiceStoreElement[],
  value: string,
): ServiceStoreService =>
  guaranteeType(
    elements.find(
      (element: ServiceStoreElement): ServiceStoreService | undefined => {
        if (element instanceof ServiceStoreService && element.id === value) {
          return element;
        }
        return undefined;
      },
    ),
    ServiceStoreService,
    `Can't find service '${value}'`,
  );

const getServiceGroup = (
  elements: ServiceStoreElement[],
  value: string,
): ServiceGroup =>
  guaranteeType(
    elements.find((element: ServiceStoreElement): ServiceGroup | undefined => {
      if (element instanceof ServiceGroup && element.id === value) {
        return element;
      }
      return undefined;
    }),
    ServiceGroup,
    `Can't find service group '${value}'`,
  );

export const V1_resolveServiceStore = (
  path: string,
  context: V1_GraphBuilderContext,
): PackageableElementImplicitReference<ServiceStore> =>
  context.createImplicitPackageableElementReference(path, (_path: string) =>
    getServiceStore(_path, context.graph),
  );

export const V1_resolveServiceGroup = (
  serviceGroupPtr: V1_ServiceGroupPtr,
  store: PackageableElementImplicitReference<ServiceStore>,
): ServiceGroup => {
  if (serviceGroupPtr.parent === undefined) {
    return getServiceGroup(store.value.elements, serviceGroupPtr.serviceGroup);
  } else {
    const parentServiceGroup = V1_resolveServiceGroup(
      serviceGroupPtr.parent,
      store,
    );
    return getServiceGroup(
      parentServiceGroup.elements,
      serviceGroupPtr.serviceGroup,
    );
  }
};

export const V1_resolveService = (
  servicePtr: V1_ServicePtr,
  context: V1_GraphBuilderContext,
): ServiceStoreService => {
  const serviceStore = V1_resolveServiceStore(servicePtr.serviceStore, context);
  if (servicePtr.parent === undefined) {
    return getService(serviceStore.value.elements, servicePtr.service);
  } else {
    const parentServiceGroup = V1_resolveServiceGroup(
      servicePtr.parent,
      serviceStore,
    );
    return getService(parentServiceGroup.elements, servicePtr.service);
  }
};

export const V1_buildTypeReference = (
  protocol: V1_TypeReference,
  context: V1_GraphBuilderContext,
): TypeReference => {
  if (protocol instanceof V1_BooleanTypeReference) {
    const booleanTypeReference = new BooleanTypeReference();
    booleanTypeReference.list = protocol.list;
    return booleanTypeReference;
  } else if (protocol instanceof V1_ComplexTypeReference) {
    const complexTypeReference = new ComplexTypeReference();
    complexTypeReference.list = protocol.list;
    complexTypeReference.type = context.graph.getClass(protocol.type);
    complexTypeReference.binding = getBinding(protocol.binding, context.graph);
    return complexTypeReference;
  } else if (protocol instanceof V1_FloatTypeReference) {
    const floatTypeReference = new FloatTypeReference();
    floatTypeReference.list = protocol.list;
    return floatTypeReference;
  } else if (protocol instanceof V1_IntegerTypeReference) {
    const integerTypeReference = new IntegerTypeReference();
    integerTypeReference.list = protocol.list;
    return integerTypeReference;
  }
  if (protocol instanceof V1_StringTypeReference) {
    const stringTypeReference = new StringTypeReference();
    stringTypeReference.list = protocol.list;
    return stringTypeReference;
  }
  throw new UnsupportedOperationError(`Can't build type reference`, protocol);
};

const V1_buildSerializationFormat = (
  protocol: V1_SerializationFormat,
): SerializationFormat => {
  const serializationFormat = new SerializationFormat();
  serializationFormat.style = protocol.style;
  serializationFormat.explode = protocol.explode;
  return serializationFormat;
};

export const V1_buildServiceParameter = (
  protocol: V1_ServiceParameter,
  context: V1_GraphBuilderContext,
): ServiceParameter => {
  const serviceParameter = new ServiceParameter();
  serviceParameter.name = guaranteeNonEmptyString(
    protocol.name,
    `Service paramater 'name' field is missing or empty`,
  );
  assertNonNullable(protocol.type, `Service parameter 'type' field is missing`);
  serviceParameter.type = V1_buildTypeReference(protocol.type, context);
  serviceParameter.location = guaranteeNonNullable(
    Object.values(LOCATION).find((type) => type === protocol.location),
    `Service parameter location '${protocol.location}' is not supported`,
  );
  serviceParameter.enumeration = protocol.enumeration;
  if (protocol.serializationFormat !== undefined) {
    serviceParameter.serializationFormat = V1_buildSerializationFormat(
      protocol.serializationFormat,
    );
  }
  return serviceParameter;
};

export const V1_buildLambdaFromProperty = (protocol: string): RawLambda => {
  const prop = new V1_AppliedProperty();
  prop.property = protocol;
  prop.parameters = [];
  const lambda = new RawLambda(object, prop);
  return lambda;
};

export const V1_buildServiceParameterMapping = (
  protocol: V1_ServiceParameterMapping,
  service: ServiceStoreService,
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
    mapping.transform = V1_buildLambdaFromProperty(protocol.property);
    return mapping;
  }
  throw new UnsupportedOperationError(
    `Can't build service parameter mapping`,
    protocol,
  );
};

const V1_buildSecurityScheme = (
  protocol: V1_SecurityScheme,
  context: V1_GraphBuilderContext,
): SecurityScheme => {
  const extraSecuritySchemeBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as SecurityScheme_PureProtocolPlugin_Extension
      ).V1_getExtraSecuritySchemeBuilders?.() ?? [],
  );
  for (const builder of extraSecuritySchemeBuilders) {
    const securityScheme = builder(protocol, context);
    if (securityScheme) {
      return securityScheme;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build security scheme: no compatible builder available from plugins`,
    protocol,
  );
};

export const V1_buildServiceStoreElement = (
  protocol: V1_ServiceStoreElement,
  owner: ServiceStore,
  context: V1_GraphBuilderContext,
  parent?: ServiceGroup | undefined,
): ServiceStoreElement => {
  if (protocol instanceof V1_ServiceStoreService) {
    const service = new ServiceStoreService();
    service.id = guaranteeNonEmptyString(
      protocol.id,
      `Service 'id' field is missing or empty`,
    );
    service.path = guaranteeNonEmptyString(
      protocol.path,
      `Service 'path' field is missing or empty`,
    );
    service.owner = owner;
    service.parent = parent;
    if (protocol.requestBody !== undefined) {
      service.requestBody = V1_buildTypeReference(
        protocol.requestBody,
        context,
      );
    }
    service.method = guaranteeNonNullable(
      Object.values(HTTP_METHOD).find((type) => type === protocol.method),
      `Service method '${protocol.method}' is not supported`,
    );
    service.parameters = protocol.parameters.map((parameter) =>
      V1_buildServiceParameter(parameter, context),
    );
    assertNonNullable(protocol.response, `Service 'response' field is missing`);
    service.response = new ComplexTypeReference();
    service.response.list = protocol.response.list;
    service.response.type = context.graph.getClass(
      guaranteeNonEmptyString(
        protocol.response.type,
        `Service response 'type' field is missing or empty`,
      ),
    );
    service.response.binding = getBinding(
      guaranteeNonEmptyString(
        protocol.response.binding,
        `Service response 'binding' field is missing or empty`,
      ),
      context.graph,
    );
    service.security = protocol.security.map((securityScheme) =>
      V1_buildSecurityScheme(securityScheme, context),
    );
    return service;
  } else if (protocol instanceof V1_ServiceGroup) {
    const serviceGroup = new ServiceGroup();
    serviceGroup.id = guaranteeNonEmptyString(
      protocol.id,
      `Service group 'id' field is missing or empty`,
    );
    serviceGroup.path = guaranteeNonEmptyString(
      protocol.path,
      `Service group 'path' field is missing or empty`,
    );
    serviceGroup.owner = owner;
    serviceGroup.parent = parent;

    serviceGroup.elements = protocol.elements.map((element) =>
      V1_buildServiceStoreElement(element, owner, context, serviceGroup),
    );
    return serviceGroup;
  }
  throw new UnsupportedOperationError(
    `Can't build service store element`,
    protocol,
  );
};
