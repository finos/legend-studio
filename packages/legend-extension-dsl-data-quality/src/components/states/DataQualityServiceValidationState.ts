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

import { makeObservable } from 'mobx';
import { DataQualityServiceValidationConfiguration } from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { DataQualityState } from './DataQualityState.js';
import type { PackageableElement } from '@finos/legend-graph';
import type {
  EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import { guaranteeType } from '@finos/legend-shared';

export class DataQualityServiceValidationState extends DataQualityState {
  constructor(
    editorStore: EditorStore,
    element: DataQualityServiceValidationConfiguration,
  ) {
    super(editorStore, element);
    makeObservable(this, {});
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const element = guaranteeType(
      newElement,
      DataQualityServiceValidationConfiguration,
      'Element inside data quality service validation editor state must be a service validation element',
    );

    return new DataQualityServiceValidationState(editorStore, element);
  }

  override get constraintsConfigurationElement(): DataQualityServiceValidationConfiguration {
    return guaranteeType(
      this.element,
      DataQualityServiceValidationConfiguration,
      'Element inside data quality service validation state must be a data quality service validation configuration element',
    );
  }
}
