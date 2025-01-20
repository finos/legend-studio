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

import { getServiceStore } from '../../../../../STO_ServiceStore_GraphManagerHelper.js';
import type { ServiceStore } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStore.js';
import {
  V1_buildRawLambdaWithResolvedPaths,
  ExternalFormatData,
  V1_resolveBinding,
  type PackageableElementImplicitReference,
  type V1_GraphBuilderContext,
  V1_buildEmbeddedData,
} from '@finos/legend-graph';
import type { V1_ServiceStoreServicePtr } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreServicePtr.js';
import {
  ServiceStoreService,
  HTTP_METHOD,
} from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreService.js';
import type { V1_ServiceGroupPtr } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceGroupPtr.js';
import { ServiceGroup } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceGroup.js';
import {
  type V1_TypeReference,
  V1_BooleanTypeReference,
  V1_ComplexTypeReference,
  V1_FloatTypeReference,
  V1_IntegerTypeReference,
  V1_StringTypeReference,
} from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_TypeReference.js';
import {
  type TypeReference,
  BooleanTypeReference,
  ComplexTypeReference,
  FloatTypeReference,
  IntegerTypeReference,
  StringTypeReference,
} from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_TypeReference.js';
import {
  assertNonNullable,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { V1_ServiceParameter } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceParameter.js';
import {
  LOCATION,
  ServiceParameter,
} from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceParameter.js';
import type { V1_ServiceStoreElement } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreElement.js';
import type { ServiceStoreElement } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreElement.js';
import { V1_ServiceStoreService } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreService.js';
import { V1_ServiceGroup } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceGroup.js';
import type { SecurityScheme } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_SecurityScheme.js';
import type { V1_SecurityScheme } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_SecurityScheme.js';
import type { STO_ServiceStore_PureProtocolPlugin_Extension } from '../../../STO_ServiceStore_PureProtocolPlugin_Extension.js';
import { SerializationFormat } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_SerializationFormat.js';
import type { V1_SerializationFormat } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_SerializationFormat.js';
import {
  getServiceStoreService,
  getServiceGroup,
  getParameter,
} from '../../../../../../graph/helpers/STO_ServiceStore_Helper.js';
import { ServiceRequestBuildInfo } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestBuildInfo.js';
import type { V1_ServiceRequestBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestBuildInfo.js';
import { ServiceRequestBodyBuildInfo } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestBodyBuildInfo.js';
import { ServiceRequestParametersBuildInfo } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestParametersBuildInfo.js';
import { ServiceRequestParameterBuildInfo } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestParameterBuildInfo.js';
import { EqualToJsonPattern } from '../../../../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_EqualToJsonPattern.js';
import { V1_EqualToJsonPattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_EqualToJsonPattern.js';
import { EqualToPattern } from '../../../../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_EqualToPattern.js';
import { V1_EqualToPattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_EqualToPattern.js';
import type { V1_StringValuePattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_StringValuePattern.js';
import type { StringValuePattern } from '../../../../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_StringValuePattern.js';
import { ServiceRequestPattern } from '../../../../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceRequestPattern.js';
import type { V1_ServiceRequestPattern } from '../../model/data/V1_STO_ServiceStore_ServiceRequestPattern.js';
import { ServiceResponseDefinition } from '../../../../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceResponseDefinition.js';
import type { V1_ServiceResponseDefinition } from '../../model/data/V1_STO_ServiceStore_ServiceResponseDefinition.js';
import { ServiceStubMapping } from '../../../../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStubMapping.js';
import type { V1_ServiceStubMapping } from '../../model/data/V1_STO_ServiceStore_ServiceStubMapping.js';
import type { V1_ServiceStoreEmbeddedData } from '../../model/data/V1_STO_ServiceStore_ServiceStoreEmbeddedData.js';
import { ServiceStoreEmbeddedData } from '../../../../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStoreEmbeddedData.js';

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
  servicePtr: V1_ServiceStoreServicePtr,
  context: V1_GraphBuilderContext,
): ServiceStoreService => {
  const serviceStore = V1_resolveServiceStore(servicePtr.serviceStore, context);
  if (servicePtr.parent === undefined) {
    return getServiceStoreService(
      serviceStore.value.elements,
      servicePtr.service,
    );
  } else {
    const parentServiceGroup = V1_resolveServiceGroup(
      servicePtr.parent,
      serviceStore,
    );
    return getServiceStoreService(
      parentServiceGroup.elements,
      servicePtr.service,
    );
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
    complexTypeReference.type = context.resolveClass(protocol.type);
    complexTypeReference.binding = V1_resolveBinding(protocol.binding, context);
    return complexTypeReference;
  } else if (protocol instanceof V1_FloatTypeReference) {
    const floatTypeReference = new FloatTypeReference();
    floatTypeReference.list = protocol.list;
    return floatTypeReference;
  } else if (protocol instanceof V1_IntegerTypeReference) {
    const integerTypeReference = new IntegerTypeReference();
    integerTypeReference.list = protocol.list;
    return integerTypeReference;
  } else if (protocol instanceof V1_StringTypeReference) {
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
  serviceParameter.allowReserved = protocol.allowReserved;
  serviceParameter.required = protocol.required;
  serviceParameter.enumeration = protocol.enumeration;
  if (protocol.serializationFormat !== undefined) {
    serviceParameter.serializationFormat = V1_buildSerializationFormat(
      protocol.serializationFormat,
    );
  }
  return serviceParameter;
};

export const V1_buildServiceRequestBuildInfo = (
  protocol: V1_ServiceRequestBuildInfo,
  service: ServiceStoreService,
  context: V1_GraphBuilderContext,
): ServiceRequestBuildInfo => {
  const requestBuildInfo = new ServiceRequestBuildInfo();

  if (protocol.requestBodyBuildInfo) {
    const requestBodyBuildInfo = new ServiceRequestBodyBuildInfo();
    requestBodyBuildInfo.transform = V1_buildRawLambdaWithResolvedPaths(
      protocol.requestBodyBuildInfo.transform.parameters,
      protocol.requestBodyBuildInfo.transform.body,
      context,
    );
    requestBuildInfo.requestBodyBuildInfo = requestBodyBuildInfo;
  }

  if (protocol.requestParametersBuildInfo) {
    const requestParametersBuildInfo = new ServiceRequestParametersBuildInfo();
    requestParametersBuildInfo.parameterBuildInfoList =
      protocol.requestParametersBuildInfo.parameterBuildInfoList.map(
        (parameterBuildInfo) => {
          const requestParameterBuildInfo =
            new ServiceRequestParameterBuildInfo();
          requestParameterBuildInfo.serviceParameter = getParameter(
            parameterBuildInfo.serviceParameter,
            service.parameters,
          );
          requestParameterBuildInfo.transform =
            V1_buildRawLambdaWithResolvedPaths(
              parameterBuildInfo.transform.parameters,
              parameterBuildInfo.transform.body,
              context,
            );
          return requestParameterBuildInfo;
        },
      );

    requestBuildInfo.requestParametersBuildInfo = requestParametersBuildInfo;
  }

  return requestBuildInfo;
};

const V1_buildSecurityScheme = (
  protocol: V1_SecurityScheme,
  context: V1_GraphBuilderContext,
): SecurityScheme => {
  const extraSecuritySchemeBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as STO_ServiceStore_PureProtocolPlugin_Extension
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
    service.response.type = context.resolveClass(
      guaranteeNonEmptyString(
        protocol.response.type,
        `Service response 'type' field is missing or empty`,
      ),
    );
    //ere
    service.response.binding = V1_resolveBinding(
      guaranteeNonEmptyString(
        protocol.response.binding,
        `Service response 'binding' field is missing or empty`,
      ),
      context,
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

const V1_buildEqualToJsonPattern = (
  protocol: V1_EqualToJsonPattern,
): EqualToJsonPattern => {
  const equalToJsonPattern = new EqualToJsonPattern();
  equalToJsonPattern.expectedValue = protocol.expectedValue;
  return equalToJsonPattern;
};

const V1_buildEqualToPattern = (
  protocol: V1_EqualToPattern,
): EqualToPattern => {
  const equalToPattern = new EqualToPattern();
  equalToPattern.expectedValue = protocol.expectedValue;
  return equalToPattern;
};

export const V1_buildStringValuePattern = (
  protocol: V1_StringValuePattern,
): StringValuePattern => {
  if (protocol instanceof V1_EqualToJsonPattern) {
    return V1_buildEqualToJsonPattern(protocol);
  } else if (protocol instanceof V1_EqualToPattern) {
    return V1_buildEqualToPattern(protocol);
  }
  throw new UnsupportedOperationError(
    `Can't build string value pattern`,
    protocol,
  );
};

const V1_buildServiceRequestPattern = (
  protocol: V1_ServiceRequestPattern,
): ServiceRequestPattern => {
  const serviceRequestPattern = new ServiceRequestPattern();
  serviceRequestPattern.url = protocol.url;
  serviceRequestPattern.urlPath = protocol.urlPath;
  serviceRequestPattern.method = protocol.method;
  if (protocol.headerParams) {
    serviceRequestPattern.headerParams = new Map<string, StringValuePattern>();
    protocol.headerParams.forEach((v: V1_StringValuePattern, key: string) => {
      serviceRequestPattern.headerParams?.set(
        key,
        V1_buildStringValuePattern(v),
      );
    });
  }
  if (protocol.queryParams) {
    serviceRequestPattern.queryParams = new Map<string, StringValuePattern>();
    protocol.queryParams.forEach((v: V1_StringValuePattern, key: string) => {
      serviceRequestPattern.queryParams?.set(
        key,
        V1_buildStringValuePattern(v),
      );
    });
  }
  serviceRequestPattern.bodyPatterns = protocol.bodyPatterns.map(
    (bodyPattern) => V1_buildStringValuePattern(bodyPattern),
  );
  return serviceRequestPattern;
};

const V1_buildServiceResponseDefinition = (
  protocol: V1_ServiceResponseDefinition,
  context: V1_GraphBuilderContext,
): ServiceResponseDefinition => {
  const serviceResponseDefinition = new ServiceResponseDefinition();
  serviceResponseDefinition.body = guaranteeType(
    V1_buildEmbeddedData(protocol.body, context),
    ExternalFormatData,
    'Service response definition body must be external format data',
  );
  return serviceResponseDefinition;
};

const V1_buildServiceStubMapping = (
  protocol: V1_ServiceStubMapping,
  context: V1_GraphBuilderContext,
): ServiceStubMapping => {
  const serviceStubMapping = new ServiceStubMapping();
  serviceStubMapping.requestPattern = V1_buildServiceRequestPattern(
    protocol.requestPattern,
  );
  serviceStubMapping.responseDefinition = V1_buildServiceResponseDefinition(
    protocol.responseDefinition,
    context,
  );
  return serviceStubMapping;
};

export const V1_buildServiceStoreEmbeddedData = (
  protocol: V1_ServiceStoreEmbeddedData,
  context: V1_GraphBuilderContext,
): ServiceStoreEmbeddedData => {
  const serviceStoreEmbeddedData = new ServiceStoreEmbeddedData();
  serviceStoreEmbeddedData.serviceStubMappings =
    protocol.serviceStubMappings.map((serviceStubMapping) =>
      V1_buildServiceStubMapping(serviceStubMapping, context),
    );
  return serviceStoreEmbeddedData;
};
