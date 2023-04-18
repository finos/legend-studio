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
  type TypeReference,
  StringTypeReference,
  BooleanTypeReference,
  FloatTypeReference,
  IntegerTypeReference,
  ComplexTypeReference,
} from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_TypeReference.js';
import {
  type V1_TypeReference,
  V1_StringTypeReference,
  V1_BooleanTypeReference,
  V1_FloatTypeReference,
  V1_ComplexTypeReference,
  V1_IntegerTypeReference,
} from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_TypeReference.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type V1_GraphTransformerContext,
  V1_RawLambda,
  V1_transformExternalFormatData,
} from '@finos/legend-graph';
import type { ServiceParameter } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceParameter.js';
import { V1_ServiceParameter } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceParameter.js';
import { ServiceStoreService } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreService.js';
import { V1_ServiceStoreService } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreService.js';
import { ServiceGroup } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceGroup.js';
import { V1_ServiceGroup } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceGroup.js';
import { V1_ServiceGroupPtr } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceGroupPtr.js';
import { V1_ServiceStoreServicePtr } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreServicePtr.js';
import type { ServiceStoreElement } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreElement.js';
import type { V1_ServiceStoreElement } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreElement.js';
import type { V1_SecurityScheme } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_SecurityScheme.js';
import type { SecurityScheme } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_SecurityScheme.js';
import type { STO_ServiceStore_PureProtocolPlugin_Extension } from '../../../STO_ServiceStore_PureProtocolPlugin_Extension.js';
import type { ServiceRequestBuildInfo } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestBuildInfo.js';
import { V1_ServiceRequestBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestBuildInfo.js';
import { V1_ServiceRequestParametersBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestParametersBuildInfo.js';
import { V1_ServiceRequestBodyBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestBodyBuildInfo.js';
import { V1_ServiceRequestParameterBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestParameterBuildInfo.js';
import { EqualToJsonPattern } from '../../../../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_EqualToJsonPattern.js';
import { EqualToPattern } from '../../../../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_EqualToPattern.js';
import type { StringValuePattern } from '../../../../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_StringValuePattern.js';
import type { ServiceRequestPattern } from '../../../../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceRequestPattern.js';
import type { ServiceResponseDefinition } from '../../../../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceResponseDefinition.js';
import type { ServiceStoreEmbeddedData } from '../../../../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStoreEmbeddedData.js';
import type { ServiceStubMapping } from '../../../../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStubMapping.js';
import { V1_EqualToJsonPattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_EqualToJsonPattern.js';
import { V1_EqualToPattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_EqualToPattern.js';
import type { V1_StringValuePattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_StringValuePattern.js';
import { V1_ServiceRequestPattern } from '../../model/data/V1_STO_ServiceStore_ServiceRequestPattern.js';
import { V1_ServiceResponseDefinition } from '../../model/data/V1_STO_ServiceStore_ServiceResponseDefinition.js';
import { V1_ServiceStoreEmbeddedData } from '../../model/data/V1_STO_ServiceStore_ServiceStoreEmbeddedData.js';
import { V1_ServiceStubMapping } from '../../model/data/V1_STO_ServiceStore_ServiceStubMapping.js';

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
  complexTypeReference.type = metamodel.type.valueForSerialization ?? '';
  complexTypeReference.binding = metamodel.binding.valueForSerialization ?? '';
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

export const V1_transformServiceRequestBuildInfo = (
  metamodel: ServiceRequestBuildInfo,
): V1_ServiceRequestBuildInfo => {
  const protocol = new V1_ServiceRequestBuildInfo();

  if (metamodel.requestBodyBuildInfo) {
    const lambda = new V1_RawLambda();
    lambda.parameters = metamodel.requestBodyBuildInfo.transform.parameters;
    lambda.body = metamodel.requestBodyBuildInfo.transform.body;

    const requestBodyBuildInfo = new V1_ServiceRequestBodyBuildInfo();
    requestBodyBuildInfo.transform = lambda;

    protocol.requestBodyBuildInfo = requestBodyBuildInfo;
  }

  if (metamodel.requestParametersBuildInfo) {
    const requestParametersBuildInfo =
      new V1_ServiceRequestParametersBuildInfo();

    requestParametersBuildInfo.parameterBuildInfoList =
      metamodel.requestParametersBuildInfo.parameterBuildInfoList.map(
        (paramBuildInfo) => {
          const lambda = new V1_RawLambda();
          lambda.parameters = paramBuildInfo.transform.parameters;
          lambda.body = paramBuildInfo.transform.body;

          const requestParameterBuildInfo =
            new V1_ServiceRequestParameterBuildInfo();
          requestParameterBuildInfo.serviceParameter =
            paramBuildInfo.serviceParameter.name;
          requestParameterBuildInfo.transform = lambda;

          return requestParameterBuildInfo;
        },
      );
    protocol.requestParametersBuildInfo = requestParametersBuildInfo;
  }

  return protocol;
};

export const V1_transformServiceParameter = (
  metamodel: ServiceParameter,
): V1_ServiceParameter => {
  const serviceParameter = new V1_ServiceParameter();
  serviceParameter.name = metamodel.name;
  serviceParameter.type = V1_transformTypeReference(metamodel.type);
  serviceParameter.location = metamodel.location;
  serviceParameter.allowReserved = metamodel.allowReserved;
  serviceParameter.required = metamodel.required;
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
        plugin as STO_ServiceStore_PureProtocolPlugin_Extension
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
  service.requestBody = metamodel.requestBody
    ? V1_transformTypeReference(metamodel.requestBody)
    : undefined;
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
  serviceGroup.parent = metamodel.parent
    ? V1_transformServiceToServiceGroupPtr(metamodel.parent)
    : undefined;
  return serviceGroup;
};

export const V1_transformServiceToServicePtr = (
  metamodel: ServiceStoreService,
): V1_ServiceStoreServicePtr => {
  const service = new V1_ServiceStoreServicePtr();
  service.service = metamodel.id;
  service.serviceStore = metamodel.owner.path;
  service.parent = metamodel.parent
    ? V1_transformServiceToServiceGroupPtr(metamodel.parent)
    : undefined;
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

const V1_transformEqualToJsonPattern = (
  metamodel: EqualToJsonPattern,
): V1_EqualToJsonPattern => {
  const equalToJsonPattern = new V1_EqualToJsonPattern();
  equalToJsonPattern.expectedValue = metamodel.expectedValue;
  return equalToJsonPattern;
};

const V1_transformEqualToPattern = (
  metamodel: EqualToPattern,
): V1_EqualToPattern => {
  const equalToPattern = new V1_EqualToPattern();
  equalToPattern.expectedValue = metamodel.expectedValue;
  return equalToPattern;
};

export const V1_transformStringValuePattern = (
  metamodel: StringValuePattern,
): V1_StringValuePattern => {
  if (metamodel instanceof EqualToJsonPattern) {
    return V1_transformEqualToJsonPattern(metamodel);
  } else if (metamodel instanceof EqualToPattern) {
    return V1_transformEqualToPattern(metamodel);
  }
  throw new UnsupportedOperationError(
    `Can't transform string value pattern`,
    metamodel,
  );
};

const V1_transformServiceRequestPattern = (
  metamodel: ServiceRequestPattern,
): V1_ServiceRequestPattern => {
  const serviceRequestPattern = new V1_ServiceRequestPattern();
  serviceRequestPattern.url = metamodel.url;
  serviceRequestPattern.urlPath = metamodel.urlPath;
  serviceRequestPattern.method = metamodel.method;
  if (metamodel.headerParams) {
    serviceRequestPattern.headerParams = new Map<
      string,
      V1_StringValuePattern
    >();
    metamodel.headerParams.forEach((v: StringValuePattern, key: string) => {
      serviceRequestPattern.headerParams?.set(
        key,
        V1_transformStringValuePattern(v),
      );
    });
  }
  if (metamodel.queryParams) {
    serviceRequestPattern.queryParams = new Map<
      string,
      V1_StringValuePattern
    >();
    metamodel.queryParams.forEach((v: StringValuePattern, key: string) => {
      serviceRequestPattern.queryParams?.set(
        key,
        V1_transformStringValuePattern(v),
      );
    });
  }
  serviceRequestPattern.bodyPatterns = metamodel.bodyPatterns.map(
    (bodyPattern) => V1_transformStringValuePattern(bodyPattern),
  );
  return serviceRequestPattern;
};

const V1_transformServiceResponseDefinition = (
  metamodel: ServiceResponseDefinition,
): V1_ServiceResponseDefinition => {
  const serviceResponseDefinition = new V1_ServiceResponseDefinition();
  serviceResponseDefinition.body = V1_transformExternalFormatData(
    metamodel.body,
  );
  return serviceResponseDefinition;
};

const V1_transformServiceStubMapping = (
  metamodel: ServiceStubMapping,
): V1_ServiceStubMapping => {
  const serviceStubMapping = new V1_ServiceStubMapping();
  serviceStubMapping.requestPattern = V1_transformServiceRequestPattern(
    metamodel.requestPattern,
  );
  serviceStubMapping.responseDefinition = V1_transformServiceResponseDefinition(
    metamodel.responseDefinition,
  );
  return serviceStubMapping;
};

export const V1_transformServiceStoreEmbeddedData = (
  metamodel: ServiceStoreEmbeddedData,
): V1_ServiceStoreEmbeddedData => {
  const serviceStoreEmbeddedData = new V1_ServiceStoreEmbeddedData();
  serviceStoreEmbeddedData.serviceStubMappings =
    metamodel.serviceStubMappings.map((serviceStubMapping) =>
      V1_transformServiceStubMapping(serviceStubMapping),
    );
  return serviceStoreEmbeddedData;
};
