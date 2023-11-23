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

import type { ProjectDependency } from '@finos/legend-server-sdlc';
import { EditorMode } from '../editor/EditorMode.js';
import type { ShowcaseViewerStore } from './ShowcaseViewerStore.js';
import { generateShowcasePath } from '../../__lib__/LegendStudioNavigation.js';
import type { QuerySDLC } from '@finos/legend-query-builder';
import { returnUndefOnError } from '@finos/legend-shared';

export interface ShowcaseViewerQuerySDLC extends QuerySDLC {
  showcasePath: string;
}

export class ShowcaseViewerEditorMode extends EditorMode {
  readonly showcaseViewerStore: ShowcaseViewerStore;

  constructor(showcaseViewerStore: ShowcaseViewerStore) {
    super();
    this.showcaseViewerStore = showcaseViewerStore;
  }

  override generateElementLink(elementPath: string): string {
    return generateShowcasePath(this.showcaseViewerStore.showcase.path);
  }
  override generateDependencyElementLink(
    elementPath: string,
    dependencyProject: ProjectDependency,
  ): string {
    return generateShowcasePath(this.showcaseViewerStore.showcase.path);
  }

  override get isInitialized(): boolean {
    return Boolean(this.showcaseViewerStore._showcase);
  }

  override get supportSdlcOperations(): boolean {
    return false;
  }

  override get label(): string {
    return 'Showcase View';
  }

  getSourceInfo(): ShowcaseViewerQuerySDLC | undefined {
    return returnUndefOnError(
      () =>
        ({
          showcasePath: this.showcaseViewerStore.showcase.path,
        }) as ShowcaseViewerQuerySDLC,
    );
  }
}
