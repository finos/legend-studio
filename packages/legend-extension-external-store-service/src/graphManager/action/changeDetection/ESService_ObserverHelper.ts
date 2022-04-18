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
  observe_Multiplicity,
  observe_Abstract_InstanceSetImplementation,
  observe_RawLambda,
} from '@finos/legend-graph';
import { computed, makeObservable, observable, override } from 'mobx';
import type { ServiceStoreConnection } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/connection/ESService_ServiceStoreConnection';
import type { LocalMappingProperty } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_LocalMappingProperty';
import type { RootServiceInstanceSetImplementation } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_RootServiceInstanceSetImplementation';
import type { ServiceMapping } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_ServiceMapping';
import type { ServiceRequestBodyBuildInfo } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_ServiceRequestBodyBuildInfo';
import type { ServiceRequestBuildInfo } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_ServiceRequestBuildInfo';
import type { ServiceRequestParameterBuildInfo } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_ServiceRequestParameterBuildInfo';
import type { ServiceRequestParametersBuildInfo } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_ServiceRequestParametersBuildInfo';
import type { SecurityScheme } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_SecurityScheme';
import type { SerializationFormat } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_SerializationFormat';
import { ServiceGroup } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_ServiceGroup';
import type { ServiceParameter } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_ServiceParameter';
import type { ServiceStore } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_ServiceStore';
import type { ServiceStoreElement } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_ServiceStoreElement';
import { ServiceStoreService } from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_ServiceStoreService';
import {
  BooleanTypeReference,
  ComplexTypeReference,
  FloatTypeReference,
  IntegerTypeReference,
  StringTypeReference,
  type TypeReference,
} from '../../../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_TypeReference';
import type { ESService_PureGraphManagerPlugin_Extension } from '../../ESService_PureGraphManagerPlugin_Extension';

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
          plugin as ESService_PureGraphManagerPlugin_Extension
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

    observe_Multiplicity(metamodel.multiplicity);

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
