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
  type ObserverContext,
  observe_Abstract_PackageableElement,
  skipObserved,
  skipObservedWithContext,
  observe_PackageableElementReference,
  observe_Abstract_Connection,
  observe_Abstract_InstanceSetImplementation,
  observe_RawLambda,
  observe_ExternalFormatData,
} from '@finos/legend-graph';
import { computed, makeObservable, observable, override } from 'mobx';
import { EqualToJsonPattern } from '../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_EqualToJsonPattern.js';
import { EqualToPattern } from '../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_EqualToPattern.js';
import type { StringValuePattern } from '../../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_StringValuePattern.js';
import type { ServiceRequestPattern } from '../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceRequestPattern.js';
import type { ServiceResponseDefinition } from '../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceResponseDefinition.js';
import type { ServiceStoreEmbeddedData } from '../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStoreEmbeddedData.js';
import type { ServiceStubMapping } from '../../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStubMapping.js';
import type { ServiceStoreConnection } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/connection/STO_ServiceStore_ServiceStoreConnection.js';
import type { LocalMappingProperty } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_LocalMappingProperty.js';
import type { RootServiceInstanceSetImplementation } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_RootServiceInstanceSetImplementation.js';
import type { ServiceMapping } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceMapping.js';
import type { ServiceRequestBodyBuildInfo } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestBodyBuildInfo.js';
import type { ServiceRequestBuildInfo } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestBuildInfo.js';
import type { ServiceRequestParameterBuildInfo } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestParameterBuildInfo.js';
import type { ServiceRequestParametersBuildInfo } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_ServiceRequestParametersBuildInfo.js';
import type { SecurityScheme } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_SecurityScheme.js';
import type { SerializationFormat } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_SerializationFormat.js';
import { ServiceGroup } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceGroup.js';
import type { ServiceParameter } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceParameter.js';
import type { ServiceStore } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStore.js';
import type { ServiceStoreElement } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreElement.js';
import { ServiceStoreService } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreService.js';
import {
  BooleanTypeReference,
  ComplexTypeReference,
  FloatTypeReference,
  IntegerTypeReference,
  StringTypeReference,
  type TypeReference,
} from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_TypeReference.js';
import type { STO_ServiceStore_PureGraphManagerPlugin_Extension } from '../../STO_ServiceStore_PureGraphManagerPlugin_Extension.js';

// ------------------------------------- Store -------------------------------------

export const observe_ServiceStoreElement = skipObservedWithContext(
  _observe_ServiceStoreElement,
);

export const observe_ServiceGroup = skipObservedWithContext(
  _observe_ServiceGroup,
);

export const observe_SerializationFormat = skipObserved(
  (metamodel: SerializationFormat): SerializationFormat =>
    makeObservable(metamodel, {
      style: observable,
      explode: observable,
      hashCode: computed,
    }),
);

const observe_Abstract_TypeReference = (metamodel: TypeReference): void => {
  makeObservable(metamodel, {
    list: observable,
  });
};

export const observe_ComplexTypeReference = skipObserved(
  (metamodel: ComplexTypeReference): ComplexTypeReference => {
    observe_Abstract_TypeReference(metamodel);

    makeObservable(metamodel, {
      type: observable,
      binding: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.type);
    //hre
    observe_PackageableElementReference(metamodel.binding);

    return metamodel;
  },
);

export const observe_TypeReference = skipObserved(
  (metamodel: TypeReference): TypeReference => {
    if (
      metamodel instanceof BooleanTypeReference ||
      metamodel instanceof FloatTypeReference ||
      metamodel instanceof IntegerTypeReference ||
      metamodel instanceof StringTypeReference
    ) {
      observe_Abstract_TypeReference(metamodel);
      return makeObservable(metamodel, {
        hashCode: computed,
      });
    } else if (metamodel instanceof ComplexTypeReference) {
      return observe_ComplexTypeReference(metamodel);
    }
    return metamodel;
  },
);

export const observe_ServiceParameter = skipObserved(
  (metamodel: ServiceParameter): ServiceParameter => {
    makeObservable(metamodel, {
      name: observable,
      type: observable,
      location: observable,
      allowReserved: observable,
      required: observable,
      enumeration: observable,
      serializationFormat: observable,
      hashCode: computed,
    });

    observe_TypeReference(metamodel.type);
    if (metamodel.serializationFormat) {
      observe_SerializationFormat(metamodel.serializationFormat);
    }

    return metamodel;
  },
);

export const observe_SecurityScheme = skipObservedWithContext(
  (metamodel: SecurityScheme, context) => {
    const extraSecuritySchemeObservers = context.plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_ServiceStore_PureGraphManagerPlugin_Extension
        ).getExtraSecuritySchemeObservers?.() ?? [],
    );
    for (const observer of extraSecuritySchemeObservers) {
      const _metamodel = observer(metamodel, context);
      if (_metamodel) {
        return _metamodel;
      }
    }
    return metamodel;
  },
);

export const observe_Abstract_ServiceStoreElement = (
  metamodel: ServiceStoreElement,
  context: ObserverContext,
): void => {
  makeObservable(metamodel, {
    id: observable,
    path: observable,
  });

  if (metamodel.parent) {
    observe_ServiceGroup(metamodel.parent, context);
  }
};

export const observe_ServiceStoreService = skipObservedWithContext(
  (metamodel: ServiceStoreService, context): ServiceStoreService => {
    observe_Abstract_ServiceStoreElement(metamodel, context);

    makeObservable(metamodel, {
      requestBody: observable,
      method: observable,
      parameters: observable,
      response: observable,
      security: observable,
      hashCode: computed,
    });

    if (metamodel.requestBody) {
      observe_TypeReference(metamodel.requestBody);
    }
    metamodel.parameters.forEach(observe_ServiceParameter);
    observe_ComplexTypeReference(metamodel.response);
    metamodel.security.forEach((securityScheme) =>
      observe_SecurityScheme(securityScheme, context),
    );

    return metamodel;
  },
);

function _observe_ServiceGroup(
  metamodel: ServiceGroup,
  context: ObserverContext,
): ServiceGroup {
  observe_Abstract_ServiceStoreElement(metamodel, context);

  makeObservable(metamodel, {
    elements: observable,
    hashCode: computed,
  });

  metamodel.elements.forEach((element) =>
    observe_ServiceStoreElement(element, context),
  );

  return metamodel;
}

function _observe_ServiceStoreElement(
  metamodel: ServiceStoreElement,
  context: ObserverContext,
): ServiceStoreElement {
  if (metamodel instanceof ServiceGroup) {
    return observe_ServiceGroup(metamodel, context);
  } else if (metamodel instanceof ServiceStoreService) {
    return observe_ServiceStoreService(metamodel, context);
  }
  return metamodel;
}

export const observe_ServiceStore = skipObservedWithContext(
  (metamodel: ServiceStore, context): ServiceStore => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<ServiceStore, '_elementHashCode'>(metamodel, {
      description: observable,
      elements: observable,
      _elementHashCode: override,
    });

    metamodel.elements.forEach((element) =>
      observe_ServiceStoreElement(element, context),
    );

    return metamodel;
  },
);

// ------------------------------------- Connection -------------------------------------

export const observe_ServiceStoreConnection = skipObserved(
  (metamodel: ServiceStoreConnection): ServiceStoreConnection => {
    observe_Abstract_Connection(metamodel);

    makeObservable(metamodel, {
      baseUrl: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

// ------------------------------------- Mapping -------------------------------------

export const observe_ServiceRequestBodyBuildInfo = skipObserved(
  (metamodel: ServiceRequestBodyBuildInfo): ServiceRequestBodyBuildInfo => {
    makeObservable(metamodel, {
      transform: observable,
      hashCode: computed,
    });

    observe_RawLambda(metamodel.transform);

    return metamodel;
  },
);

export const observe_ServiceRequestParameterBuildInfo = skipObserved(
  (
    metamodel: ServiceRequestParameterBuildInfo,
  ): ServiceRequestParameterBuildInfo => {
    makeObservable(metamodel, {
      serviceParameter: observable,
      transform: observable,
      hashCode: computed,
    });

    observe_ServiceParameter(metamodel.serviceParameter);
    observe_RawLambda(metamodel.transform);

    return metamodel;
  },
);

export const observe_ServiceRequestParametersBuildInfo = skipObserved(
  (
    metamodel: ServiceRequestParametersBuildInfo,
  ): ServiceRequestParametersBuildInfo => {
    makeObservable(metamodel, {
      parameterBuildInfoList: observable,
      hashCode: computed,
    });

    metamodel.parameterBuildInfoList.forEach(
      observe_ServiceRequestParameterBuildInfo,
    );

    return metamodel;
  },
);

export const observe_ServiceRequestBuilderInfo = skipObserved(
  (metamodel: ServiceRequestBuildInfo): ServiceRequestBuildInfo => {
    makeObservable(metamodel, {
      requestBodyBuildInfo: observable,
      // TODO? requestParametersBuildInfo: observable.ref,
      hashCode: computed,
    });

    if (metamodel.requestBodyBuildInfo) {
      observe_ServiceRequestBodyBuildInfo(metamodel.requestBodyBuildInfo);
    }
    if (metamodel.requestParametersBuildInfo) {
      observe_ServiceRequestParametersBuildInfo(
        metamodel.requestParametersBuildInfo,
      );
    }

    return metamodel;
  },
);

export const observe_ServiceMapping = skipObservedWithContext(
  (metamodel: ServiceMapping, context): ServiceMapping => {
    makeObservable(metamodel, {
      service: observable,
      pathOffset: observable.ref,
      requestBuildInfo: observable,
      hashCode: computed,
    });

    observe_ServiceStoreService(metamodel.service, context);
    if (metamodel.requestBuildInfo) {
      observe_ServiceRequestBuilderInfo(metamodel.requestBuildInfo);
    }

    return metamodel;
  },
);

export const observe_LocalMappingProperty = skipObserved(
  (metamodel: LocalMappingProperty): LocalMappingProperty => {
    makeObservable(metamodel, {
      name: observable,
      type: observable,
      multiplicity: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

export const observe_RootServiceInstanceSetImplementation =
  skipObservedWithContext(
    (
      metamodel: RootServiceInstanceSetImplementation,
      context,
    ): RootServiceInstanceSetImplementation => {
      observe_Abstract_InstanceSetImplementation(metamodel, context);

      makeObservable(metamodel, {
        localMappingProperties: observable,
        servicesMapping: observable,
        hashCode: computed,
      });

      metamodel.localMappingProperties.forEach(observe_LocalMappingProperty);
      metamodel.servicesMapping.forEach((serviceMapping) =>
        observe_ServiceMapping(serviceMapping, context),
      );

      return metamodel;
    },
  );

// ------------------------------------- Data -------------------------------------

export const observe_EqualToJsonPattern = skipObserved(
  (metamodel: EqualToJsonPattern): EqualToJsonPattern => {
    makeObservable(metamodel, {
      expectedValue: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

export const observe_EqualToPattern = skipObserved(
  (metamodel: EqualToPattern): EqualToPattern => {
    makeObservable(metamodel, {
      expectedValue: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

export function observe_StringValuePattern(
  metamodel: StringValuePattern,
): StringValuePattern {
  if (metamodel instanceof EqualToJsonPattern) {
    return observe_EqualToJsonPattern(metamodel);
  } else if (metamodel instanceof EqualToPattern) {
    return observe_EqualToPattern(metamodel);
  }
  return metamodel;
}

export const observe_ServiceRequestPattern = skipObserved(
  (metamodel: ServiceRequestPattern): ServiceRequestPattern => {
    makeObservable(metamodel, {
      url: observable,
      urlPath: observable,
      method: observable,
      headerParams: observable,
      queryParams: observable,
      bodyPatterns: observable,
      hashCode: computed,
    });
    if (metamodel.headerParams) {
      Array.from(metamodel.headerParams.values()).forEach(
        observe_StringValuePattern,
      );
    }
    if (metamodel.queryParams) {
      Array.from(metamodel.queryParams.values()).forEach(
        observe_StringValuePattern,
      );
    }
    metamodel.bodyPatterns.forEach(observe_StringValuePattern);
    return metamodel;
  },
);

export const observe_ServiceResponseDefinition = skipObserved(
  (metamodel: ServiceResponseDefinition): ServiceResponseDefinition => {
    makeObservable(metamodel, {
      body: observable,
      hashCode: computed,
    });

    observe_ExternalFormatData(metamodel.body);

    return metamodel;
  },
);

export const observe_ServiceStubMapping = skipObserved(
  (metamodel: ServiceStubMapping): ServiceStubMapping => {
    makeObservable(metamodel, {
      requestPattern: observable,
      responseDefinition: observable,
      hashCode: computed,
    });

    observe_ServiceRequestPattern(metamodel.requestPattern);
    observe_ServiceResponseDefinition(metamodel.responseDefinition);
    return metamodel;
  },
);

export const observe_ServiceStoreEmbeddedData = skipObserved(
  (metamodel: ServiceStoreEmbeddedData): ServiceStoreEmbeddedData => {
    makeObservable(metamodel, {
      serviceStubMappings: observable,
      hashCode: computed,
    });
    metamodel.serviceStubMappings.forEach(observe_ServiceStubMapping);
    return metamodel;
  },
);
