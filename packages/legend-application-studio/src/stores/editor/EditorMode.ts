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

import type { LegendSourceInfo } from '@finos/legend-storage';
import type { ProjectDependency } from '@finos/legend-server-sdlc';

export enum LegendStudioSourceType {
  SHOWCASE = 'legend-source-studio-showcase',
  PROJECT_WORKSPACE = 'legend-source-studio-project-workspace',
}

export abstract class EditorMode {
  /**
   * Using information about the current project to generate a sharable link to the element.
   */
  abstract generateElementLink(elementPath: string): string;

  /**
   * Using information about the dependency project to generate a sharable link to the element.
   */
  abstract generateDependencyElementLink(
    elementPath: string,
    dependencyProject: ProjectDependency,
  ): string;

  abstract get isInitialized(): boolean;

  /**
   * Using information about the current project to generate source information
   */
  abstract getSourceInfo(): LegendSourceInfo | undefined;

  get supportSdlcOperations(): boolean {
    return true;
  }

  get disableEditing(): boolean {
    return false;
  }

  get label(): string | undefined {
    return undefined;
  }
}
