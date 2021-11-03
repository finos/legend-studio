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

import packageJson from '../package.json';

import type {
  DSL_StudioPlugin_Extension,
  GenerationFile,
  FileGenerationState,
  StudioPluginManager,
  FileGenerationResultViewerAction,
} from '@finos/legend-studio';

import { StudioPlugin } from '@finos/legend-studio';
import { NetworkClient } from '@finos/legend-shared';

const LowercasedMorphirTypeName = `morphir`;

export class ELMorphir_GenerationPlugin
  extends StudioPlugin
  implements DSL_StudioPlugin_Extension
{
  networkClient: NetworkClient;

  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
    this.networkClient = new NetworkClient();
  }

  install(pluginManager: StudioPluginManager): void {
    pluginManager.registerStudioPlugin(this);
  }

  override configure(_configData: object): ELMorphir_GenerationPlugin {
    return this;
  }

  visualizeMorphir =
    (fileNode: GenerationFile): (() => void) =>
    async (): Promise<void> => {
      await this.networkClient.post(
        `http://0.0.0.0:9901/insight`,
        fileNode.content,
      );
      window.open('http://0.0.0.0:9901/insight');
    };

  visualizeBosque =
    (
      fileGenerationState: FileGenerationState,
      fileNode: GenerationFile,
    ): (() => void) =>
    async (): Promise<void> => {
      const code =
        fileGenerationState.editorStore.graphManagerState.graphManager.graphToPureCode(
          fileGenerationState.editorStore.graphManagerState.graph,
        );
      await this.networkClient.post(`http://0.0.0.0:9900/lint`, {
        ir: fileNode.content,
        src: await code,
      });
      window.open('http://localhost:3050');
    };

  getExtraFileGenerationResultViewerActions(): FileGenerationResultViewerAction[] {
    return [
      (
        fileGenerationState: FileGenerationState,
        fileNode: GenerationFile,
      ): React.ReactNode | undefined => {
        if (this.isMorphirGenerationType(fileGenerationState)) {
          return (
            <div className="panel__header__title__content generation-result-viewer__file__header-button">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                onClick={this.visualizeMorphir(fileNode)}
                tabIndex={-1}
              >
                Visualize Generated IR
              </button>
            </div>
          );
        }
        return undefined;
      },
      (
        fileGenerationState: FileGenerationState,
        fileNode: GenerationFile,
      ): React.ReactNode | undefined => {
        if (this.isMorphirGenerationType(fileGenerationState)) {
          return (
            <div className="panel__header__title__content generation-result-viewer__file__header-button">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                onClick={this.visualizeBosque(fileGenerationState, fileNode)}
                tabIndex={-1}
              >
                View Bosque Feedback
              </button>
            </div>
          );
        }
        return undefined;
      },
    ];
  }

  isMorphirGenerationType(fileGenerationState: FileGenerationState): boolean {
    return (
      fileGenerationState.fileGeneration.type.toLowerCase() ===
      LowercasedMorphirTypeName
    );
  }
}
