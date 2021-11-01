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

/* eslint-disable @finos/legend-studio/no-cross-workspace-source-usage */

import packageJson from '../package.json';

import type { StudioPluginManager } from '@finos/legend-studio';

import { StudioPlugin } from '@finos/legend-studio';
import { NetworkClient } from '@finos/legend-shared';
import type { GenerationFile } from '@finos/legend-studio/src/stores/shared/FileGenerationTreeUtil';
import type { FileGenerationState } from '@finos/legend-studio/src/stores/editor-state/FileGenerationState';

export class MorphirGenerationPlugin extends StudioPlugin {
  networkClient: NetworkClient;

  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
    this.networkClient = new NetworkClient();
  }

  install(pluginManager: StudioPluginManager): void {
    pluginManager.registerStudioPlugin(this);
  }

  visualizeMorphir(fileNode: GenerationFile): void {
    this.networkClient.post(
      `http://0.0.0.0:9901/insight`,
      (fileNode as GenerationFile).content,
    );
    window.open('http://0.0.0.0:9901/insight');
  }

  async visualizeBosque(
    fileGenerationState: FileGenerationState,
    fileNode: GenerationFile,
  ): Promise<void> {
    const code =
      fileGenerationState.editorStore.graphManagerState.graphManager.graphToPureCode(
        fileGenerationState.editorStore.graphManagerState.graph,
      );
    fileGenerationState.networkClient.post(`http://0.0.0.0:9900/lint`, {
      ir: (fileNode as GenerationFile).content,
      src: await code,
    });
    window.open('http://localhost:3050');
  }
}
