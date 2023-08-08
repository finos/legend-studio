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
  type EditorStore,
  EmbeddedDataState,
} from '@finos/legend-application-studio';
import { action, makeObservable, observable } from 'mobx';
import type { ServiceStoreEmbeddedData } from '../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStoreEmbeddedData.js';
import type { ServiceStubMapping } from '../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStubMapping.js';

export enum SERVICE_STUB_MAPPING_TAB_TYPE {
  SERVICE_REQUEST_PATTERN = 'SERVICE_REQUEST_PATTERN',
  SERVICE_RESPONSE_DEFINITION = 'SERVICE_RESPONSE_DEFINITION',
}

export enum SERVICE_REQUEST_PATTERN_TAB_TYPE {
  HEADER_PARAMS = 'HEADER_PARAMS',
  QUERY_PARAMS = 'QUERY_PARAMS',
  BODY_PATTERNS = 'BODY_PATTERNS',
}

export class ServiceStubMappingState {
  serviceStubMapping?: ServiceStubMapping | undefined;
  selectedTab = SERVICE_STUB_MAPPING_TAB_TYPE.SERVICE_REQUEST_PATTERN;
  selectedServiceRequestPatternTab =
    SERVICE_REQUEST_PATTERN_TAB_TYPE.HEADER_PARAMS;
  urlPath: string;

  constructor(
    editorStore: EditorStore,
    serviceStubMapping: ServiceStubMapping | undefined,
  ) {
    this.serviceStubMapping = serviceStubMapping;
    this.urlPath =
      serviceStubMapping?.requestPattern.urlPath ??
      serviceStubMapping?.requestPattern.url ??
      '';

    makeObservable(this, {
      selectedTab: observable,
      serviceStubMapping: observable,
      urlPath: observable,
      selectedServiceRequestPatternTab: observable,
      setUrlPath: action,
      setSelectedTab: action,
    });
  }

  setSelectedTab(val: SERVICE_STUB_MAPPING_TAB_TYPE): void {
    this.selectedTab = val;
  }

  setUrlPath(val: string): void {
    this.urlPath = val;
  }

  setSelectedServiceRequestPatternTab(
    val: SERVICE_REQUEST_PATTERN_TAB_TYPE,
  ): void {
    this.selectedServiceRequestPatternTab = val;
  }
}

export class ServiceStoreEmbeddedDataState extends EmbeddedDataState {
  override embeddedData: ServiceStoreEmbeddedData;
  currentServiceStubMappingState?: ServiceStubMappingState | undefined;

  constructor(
    editorStore: EditorStore,
    embeddedData: ServiceStoreEmbeddedData,
  ) {
    super(editorStore, embeddedData);
    this.embeddedData = embeddedData;

    makeObservable(this, {
      currentServiceStubMappingState: observable,
      setCurrentServiceStubMappingState: action,
    });
    if (this.embeddedData.serviceStubMappings.length !== 0) {
      this.currentServiceStubMappingState = new ServiceStubMappingState(
        this.editorStore,
        this.embeddedData.serviceStubMappings[0],
      );
    }
  }

  setCurrentServiceStubMappingState(
    val: ServiceStubMappingState | undefined,
  ): void {
    this.currentServiceStubMappingState = val;
  }

  label(): string {
    return 'ServiceStore Embedded Data';
  }
}
