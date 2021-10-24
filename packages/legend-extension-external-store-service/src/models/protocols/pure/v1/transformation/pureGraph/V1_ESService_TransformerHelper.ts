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
  StringTypeReference,
  BooleanTypeReference,
  FloatTypeReference,
  IntegerTypeReference,
  ComplexTypeReference,
} from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/TypeReference';
import {
  V1_StringTypeReference,
  V1_BooleanTypeReference,
  V1_FloatTypeReference,
  V1_ComplexTypeReference,
  V1_IntegerTypeReference,
} from '../../model/packageableElements/store/serviceStore/model/V1_TypeReference';
import type { TypeReference } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/TypeReference';
import type { V1_TypeReference } from '../../model/packageableElements/store/serviceStore/model/V1_TypeReference';
import { UnsupportedOperationError } from '@finos/legend-shared';
import type { ServiceParameterMapping } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/mapping/ServiceParameterMapping';
import type { V1_ServiceParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_ServiceParameterMapping';
import { V1_ParameterIndexedParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_ParameterIndexedParameterMapping';
import type { V1_GraphTransformerContext } from '@finos/legend-graph';
import { V1_AppliedProperty, V1_RawLambda } from '@finos/legend-graph';
import { V1_PropertyIndexedParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_PropertyIndexedParameterMapping';
import type { ServiceParameter } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceParameter';
import { V1_ServiceParameter } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceParameter';
import { ServiceStoreService } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStoreService';
import { V1_ServiceStoreService } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceStoreService';
import { ServiceGroup } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceGroup';
import { V1_ServiceGroup } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceGroup';
import { V1_ServiceGroupPtr } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceGroupPtr';
import { V1_ServicePtr } from '../../model/packageableElements/store/serviceStore/model/V1_ServicePtr';
import type { ServiceStoreElement } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStoreElement';
import type { V1_ServiceStoreElement } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceStoreElement';
import type { V1_SecurityScheme } from '../../model/packageableElements/store/serviceStore/model/V1_SecurityScheme';
import type { SecurityScheme } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/SecurityScheme';
import type { SecurityScheme_PureProtocolPlugin_Extension } from '../../../SecurityScheme_PureProtocolPlugin_Extension';

export const V1_transformStringTypeReference = (
  metamodel: StringTypeReference,
): V1_StringTypeReference => {
  const stringTypeReference = new V1_StringTypeReference();
  stringTypeReference.list = metamodel.list;
  return stringTypeReference;
};

export const V1_transformBooleanTypeReference = (
  metamodel: BooleanTypeReference,
): V1_BooleanTypeReference => {
  const booleanTypeReference = new V1_BooleanTypeReference();
  booleanTypeReference.list = metamodel.list;
  return booleanTypeReference;
};

export const V1_transformFloatTypeReference = (
  metamodel: FloatTypeReference,
): V1_FloatTypeReference => {
  const floatTypeReference = new V1_FloatTypeReference();
  floatTypeReference.list = metamodel.list;
  return floatTypeReference;
};

export const V1_transformIntegerTypeReference = (
  metamodel: IntegerTypeReference,
): V1_IntegerTypeReference => {
  const integerTypeReference = new V1_IntegerTypeReference();
  integerTypeReference.list = metamodel.list;
  return integerTypeReference;
};

export const V1_transformComplexTypeReference = (
  metamodel: ComplexTypeReference,
): V1_ComplexTypeReference => {
  const complexTypeReference = new V1_ComplexTypeReference();
  complexTypeReference.list = metamodel.list;
  complexTypeReference.type = metamodel.type.path;
  complexTypeReference.binding = metamodel.binding.path;
  return complexTypeReference;
};

export const V1_transformTypeReference = (
  metamodel: TypeReference,
): V1_TypeReference => {
  if (metamodel instanceof BooleanTypeReference) {
    return V1_transformBooleanTypeReference(metamodel);
  } else if (metamodel instanceof ComplexTypeReference) {
    return V1_transformComplexTypeReference(metamodel);
  } else if (metamodel instanceof FloatTypeReference) {
    return V1_transformFloatTypeReference(metamodel);
  } else if (metamodel instanceof IntegerTypeReference) {
    return V1_transformIntegerTypeReference(metamodel);
  } else if (metamodel instanceof StringTypeReference) {
    return V1_transformStringTypeReference(metamodel);
  }
  throw new UnsupportedOperationError(
    `Can't transform type reference`,
    metamodel,
  );
};

export const V1_transformServiceParameterMapping = (
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
    if (metamodel.transform.body !== undefined) {
      if (metamodel.transform.body instanceof V1_AppliedProperty) {
        const property: V1_AppliedProperty = metamodel.transform.body;
        mapping.property = property.property;
      }
    }
    return mapping;
  }
  throw new UnsupportedOperationError(
    `Can't transform service parameter mapping`,
    metamodel,
  );
};

export const V1_transformServiceParameter = (
  metamodel: ServiceParameter,
): V1_ServiceParameter => {
  const serviceParameter = new V1_ServiceParameter();
  serviceParameter.name = metamodel.name;
  serviceParameter.type = V1_transformTypeReference(metamodel.type);
  serviceParameter.location = metamodel.location;
  serviceParameter.enumeration = metamodel.enumeration;
  serviceParameter.serializationFormat = metamodel.serializationFormat;
  return serviceParameter;
};

const V1_transformSecurityScheme = (
  metamodel: SecurityScheme,
  context: V1_GraphTransformerContext,
): V1_SecurityScheme => {
  const extraSecuritySchemeTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as SecurityScheme_PureProtocolPlugin_Extension
      ).V1_getExtraSecuritySchemeTransformers?.() ?? [],
  );
  for (const transformer of extraSecuritySchemeTransformers) {
    const protocol = transformer(metamodel, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform security scheme: no compatible transformer available from plugins`,
    metamodel,
  );
};

export const V1_transformServiceStoreService = (
  metamodel: ServiceStoreService,
  context: V1_GraphTransformerContext,
): V1_ServiceStoreService => {
  const service = new V1_ServiceStoreService();
  service.id = metamodel.id;
  service.path = metamodel.path;
  if (metamodel.requestBody !== undefined) {
    service.requestBody = V1_transformTypeReference(metamodel.requestBody);
  }
  service.method = metamodel.method;
  service.parameters = metamodel.parameters.map((parameter) =>
    V1_transformServiceParameter(parameter),
  );
  service.response = V1_transformComplexTypeReference(metamodel.response);
  service.security = metamodel.security.map((securityScheme) =>
    V1_transformSecurityScheme(securityScheme, context),
  );
  return service;
};

export const V1_transformServiceToServiceGroupPtr = (
  metamodel: ServiceGroup,
): V1_ServiceGroupPtr => {
  const serviceGroup = new V1_ServiceGroupPtr();
  serviceGroup.serviceGroup = metamodel.id;
  serviceGroup.serviceStore = metamodel.owner.path;
  if (metamodel.parent !== undefined) {
    serviceGroup.parent = V1_transformServiceToServiceGroupPtr(
      metamodel.parent,
    );
  }
  return serviceGroup;
};

export const V1_transformServiceToServicePtr = (
  metamodel: ServiceStoreService,
): V1_ServicePtr => {
  const service = new V1_ServicePtr();
  service.service = metamodel.id;
  service.serviceStore = metamodel.owner.path;
  if (metamodel.parent !== undefined) {
    service.parent = V1_transformServiceToServiceGroupPtr(metamodel.parent);
  }
  return service;
};

export const V1_transformServiceStoreElement = (
  metamodel: ServiceStoreElement,
  context: V1_GraphTransformerContext,
): V1_ServiceStoreElement => {
  if (metamodel instanceof ServiceStoreService) {
    return V1_transformServiceStoreService(metamodel, context);
  } else if (metamodel instanceof ServiceGroup) {
    const serviceGroup = new V1_ServiceGroup();
    serviceGroup.id = metamodel.id;
    serviceGroup.path = metamodel.path;
    serviceGroup.elements = metamodel.elements.map((element) =>
      V1_transformServiceStoreElement(element, context),
    );
    return serviceGroup;
  }
  throw new UnsupportedOperationError(
    `Can't transform service store element`,
    metamodel,
  );
};
