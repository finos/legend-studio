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

import type { PackageableElement } from '@finos/legend-graph';
import type { FileGenerationState } from './editor-state/FileGenerationState';
import type { DSL_LegendStudioPlugin_Extension } from './LegendStudioPlugin';

export type FileGenerationResultViewerActionConfiguration = {
  key: string;
  renderer: (
    fileGenerationState: FileGenerationState,
  ) => React.ReactNode | undefined;
};

export type FileGenerationScopeFilterConfiguration = {
  type: string;
  filter: (element: PackageableElement) => boolean;
};

export interface DSLGenerationSpecification_LegendStudioPlugin_Extension
  extends DSL_LegendStudioPlugin_Extension {
  /**
   * Get drag-and-drop type specifier for model generation specification elements.
   */
  getExtraModelGenerationSpecificationElementDnDTypes?(): string[];

  /**
   * Get the list of the file generation result viewer actions to be rendered.
   */
  getExtraFileGenerationResultViewerActionConfigurations?(): FileGenerationResultViewerActionConfiguration[];

  /**
   * Get the list of filters that check if an element is in scope for certain file generation.
   */
  getExtraFileGenerationScopeFilterConfigurations?(): FileGenerationScopeFilterConfiguration[];
}
