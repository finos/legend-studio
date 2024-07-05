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
  NewElementDriver,
} from '@finos/legend-application-studio';
import { DataQualityServiceValidationConfiguration } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { action, makeObservable, observable } from 'mobx';
import type { Service } from '@finos/legend-graph';
import {
  type PackageableElementOption,
  buildElementOption,
} from '@finos/legend-lego/graph-editor';

export class DataQuality_ServiceElementDriver extends NewElementDriver<DataQualityServiceValidationConfiguration> {
  serviceSelected: PackageableElementOption<Service> | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      serviceSelected: observable,
      setServiceSelected: action,
    });

    this.serviceSelected =
      editorStore.graphManagerState.usableServices.map(buildElementOption)[0];
  }

  setServiceSelected(
    serviceSelected: PackageableElementOption<Service> | undefined,
  ): void {
    this.serviceSelected = serviceSelected;
  }

  get isValid(): boolean {
    return Boolean(this.serviceSelected);
  }

  createElement(name: string): DataQualityServiceValidationConfiguration {
    return new DataQualityServiceValidationConfiguration(name);
  }
}
