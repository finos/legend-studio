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
  observe_ExternalFormatData,
  observe_PackageableElementReference,
  type ExternalFormatData,
  type PackageableElementReference,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action } from 'mobx';
import {
  observe_ServiceStubMapping,
  observe_StringValuePattern,
} from '../../graph-manager/action/changeDetection/STO_ServiceStore_ObserverHelper.js';
import type { StringValuePattern } from '../../graph/metamodel/pure/model/data/contentPattern/STO_ServiceStore_StringValuePattern.js';
import type { ServiceRequestPattern } from '../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceRequestPattern.js';
import type { ServiceResponseDefinition } from '../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceResponseDefinition.js';
import type { ServiceStoreEmbeddedData } from '../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStoreEmbeddedData.js';
import type { ServiceStubMapping } from '../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStubMapping.js';
import type { ServiceStoreConnection } from '../../graph/metamodel/pure/model/packageableElements/store/serviceStore/connection/STO_ServiceStore_ServiceStoreConnection.js';
import { HTTP_METHOD } from '../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreService.js';
import type { ServiceStore } from '../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStore.js';

export const service_store_connection_setStore = action(
  (
    con: ServiceStoreConnection,
    val: PackageableElementReference<ServiceStore>,
  ): void => {
    con.store = observe_PackageableElementReference(val);
  },
);

export const serviceStore_connection_setBaseUrl = action(
  (conn: ServiceStoreConnection, baseUrl: string): void => {
    conn.baseUrl = baseUrl;
  },
);

export const serviceStore_embeddedData_addServiceStubMapping = action(
  (
    serviceStoreEmbeddedData: ServiceStoreEmbeddedData,
    val: ServiceStubMapping,
  ): void => {
    addUniqueEntry(
      serviceStoreEmbeddedData.serviceStubMappings,
      observe_ServiceStubMapping(val),
    );
  },
);

export const serviceStore_embeddedData_deleteServiceStubMapping = action(
  (
    serviceStoreEmbeddedData: ServiceStoreEmbeddedData,
    val: ServiceStubMapping,
  ): void => {
    deleteEntry(serviceStoreEmbeddedData.serviceStubMappings, val);
  },
);

export const serviceStore_serviceResponseDefinition_setBody = action(
  (
    serviceResponseDefinition: ServiceResponseDefinition,
    value: ExternalFormatData,
  ): void => {
    serviceResponseDefinition.body = observe_ExternalFormatData(value);
  },
);

export const serviceStore_serviceRequestPattern_setUrl = action(
  (
    serviceResquestPattern: ServiceRequestPattern,
    value: string | undefined,
  ): void => {
    serviceResquestPattern.url = value;
  },
);

export const serviceStore_serviceRequestPattern_setUrlPath = action(
  (
    serviceResquestPattern: ServiceRequestPattern,
    value: string | undefined,
  ): void => {
    serviceResquestPattern.urlPath = value;
  },
);

export const serviceStore_serviceRequestPattern_setMethod = action(
  (serviceResquestPattern: ServiceRequestPattern, value: HTTP_METHOD): void => {
    serviceResquestPattern.method = value;
    if (value === HTTP_METHOD.GET) {
      serviceResquestPattern.bodyPatterns = [];
    }
  },
);

export const serviceStore_serviceRequestPattern_addBodyPatterns = action(
  (
    serviceRequestPattern: ServiceRequestPattern,
    val: StringValuePattern,
  ): void => {
    addUniqueEntry(
      serviceRequestPattern.bodyPatterns,
      observe_StringValuePattern(val),
    );
  },
);

export const serviceStore_serviceRequestPattern_deleteBodyPatterns = action(
  (
    serviceRequestPattern: ServiceRequestPattern,
    val: StringValuePattern,
  ): void => {
    deleteEntry(serviceRequestPattern.bodyPatterns, val);
  },
);

export const serviceStore_serviceRequestPattern_setHeaderParams = action(
  (
    serviceResquestPattern: ServiceRequestPattern,
    value: Map<string, StringValuePattern>,
  ): void => {
    serviceResquestPattern.headerParams = value;
  },
);

export const serviceStore_serviceRequestPattern_setQueryParams = action(
  (
    serviceResquestPattern: ServiceRequestPattern,
    value: Map<string, StringValuePattern>,
  ): void => {
    serviceResquestPattern.queryParams = value;
  },
);

export const serviceStore_serviceStubMapping_setServiceRequestPattern = action(
  (
    serviceStubMapping: ServiceStubMapping,
    value: ServiceRequestPattern,
  ): void => {
    serviceStubMapping.requestPattern = value;
  },
);

export const serviceStore_serviceStubMapping_setServiceResponseDefinition =
  action(
    (
      serviceStubMapping: ServiceStubMapping,
      value: ServiceResponseDefinition,
    ): void => {
      serviceStubMapping.responseDefinition = value;
    },
  );

export const serviceStore_stringValuePattern_setExpectedValue = action(
  (stringValuePattern: StringValuePattern, value: string): void => {
    stringValuePattern.expectedValue = value;
  },
);

export const serviceStore_serviceRequestPattern_addQueryParams = action(
  (
    serviceRequestPattern: ServiceRequestPattern,
    key: string,
    val: StringValuePattern,
  ): void => {
    if (!serviceRequestPattern.queryParams) {
      serviceStore_serviceRequestPattern_setQueryParams(
        serviceRequestPattern,
        new Map<string, StringValuePattern>(),
      );
    }
    serviceRequestPattern.queryParams?.set(key, val);
  },
);

export const serviceStore_serviceRequestPattern_deleteQueryParams = action(
  (serviceRequestPattern: ServiceRequestPattern, key: string): void => {
    serviceRequestPattern.queryParams?.delete(key);
  },
);

export const serviceStore_serviceRequestPattern_addHeaderParams = action(
  (
    serviceRequestPattern: ServiceRequestPattern,
    key: string,
    val: StringValuePattern,
  ): void => {
    if (!serviceRequestPattern.headerParams) {
      serviceStore_serviceRequestPattern_setHeaderParams(
        serviceRequestPattern,
        new Map<string, StringValuePattern>(),
      );
    }
    serviceRequestPattern.headerParams?.set(key, val);
  },
);

export const serviceStore_serviceRequestPattern_deleteHeaderParams = action(
  (serviceRequestPattern: ServiceRequestPattern, key: string): void => {
    serviceRequestPattern.headerParams?.delete(key);
  },
);

export const serviceStore_serviceRequestPattern_updateHeaderParamValue = action(
  (
    serviceRequestpattern: ServiceRequestPattern,
    key: string,
    value: StringValuePattern,
  ): void => {
    serviceRequestpattern.headerParams?.set(key, value);
  },
);

export const serviceStore_serviceRequestPattern_updateHeaderParameterName =
  action(
    (
      serviceRequestPattern: ServiceRequestPattern,
      oldKey: string,
      newKey: string,
    ): void => {
      const headerParameterValue =
        serviceRequestPattern.headerParams?.get(oldKey);
      serviceRequestPattern.headerParams?.delete(oldKey);
      serviceRequestPattern.headerParams?.set(
        newKey,
        guaranteeNonNullable(headerParameterValue),
      );
    },
  );

export const serviceStore_serviceRequestPattern_updateQueryParamValue = action(
  (
    serviceRequestpattern: ServiceRequestPattern,
    key: string,
    value: StringValuePattern,
  ): void => {
    serviceRequestpattern.queryParams?.set(key, value);
  },
);

export const serviceStore_serviceRequestPattern_updateQueryParameterName =
  action(
    (
      serviceRequestPattern: ServiceRequestPattern,
      oldKey: string,
      newKey: string,
    ): void => {
      const queryParameterValue =
        serviceRequestPattern.queryParams?.get(oldKey);
      serviceRequestPattern.queryParams?.delete(oldKey);
      serviceRequestPattern.queryParams?.set(
        newKey,
        guaranteeNonNullable(queryParameterValue),
      );
    },
  );

export const serviceStore_serviceRequestPattern_updateBodyPattern = action(
  (
    serviceRequestPattern: ServiceRequestPattern,
    index: number,
    newValue: StringValuePattern,
  ): void => {
    serviceRequestPattern.bodyPatterns[index] =
      observe_StringValuePattern(newValue);
  },
);
