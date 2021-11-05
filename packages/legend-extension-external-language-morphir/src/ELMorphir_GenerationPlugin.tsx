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
  FileGenerationScopeFilter,
} from '@finos/legend-studio';

import { StudioPlugin } from '@finos/legend-studio';
import { NetworkClient, assertNonEmptyString } from '@finos/legend-shared';
import type { PackageableElement } from '@finos/legend-graph';
import { ConcreteFunctionDefinition } from '@finos/legend-graph';

const MORPHIR_TYPE_NAME = `morphir`;

interface ELMorphir_GenerationPluginConfigData {
  morphirVisualizerUrl: string;
  linterServerUrl: string;
  linterAppUrl: string;
}

export class ELMorphir_GenerationPlugin
  extends StudioPlugin
  implements DSL_StudioPlugin_Extension
{
  networkClient: NetworkClient;
  morphirVisualizerUrl = ``;
  linterServerUrl = ``;
  linterAppUrl = ``;

  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
    this.networkClient = new NetworkClient();
  }

  install(pluginManager: StudioPluginManager): void {
    pluginManager.registerStudioPlugin(this);
  }

  override configure(_configData: object): ELMorphir_GenerationPlugin {
    const configData = _configData as ELMorphir_GenerationPluginConfigData;
    assertNonEmptyString(
      configData.morphirVisualizerUrl,
      `Can't configure morphir visualizer url for generation plugin: 'url' field is missing or empty`,
    );
    assertNonEmptyString(
      configData.linterServerUrl,
      `Can't configure linter server url for generation plugin: 'url' field is missing or empty`,
    );
    assertNonEmptyString(
      configData.linterAppUrl,
      `Can't configure linter app url for generation plugin: 'url' field is missing or empty`,
    );
    this.morphirVisualizerUrl = configData.morphirVisualizerUrl;
    this.linterServerUrl = configData.linterServerUrl;
    this.linterAppUrl = configData.linterAppUrl;

    return this;
  }

  visualizeMorphir =
    (fileNode: GenerationFile): (() => void) =>
    async (): Promise<void> => {
      assertNonEmptyString(this.morphirVisualizerUrl);
      window.open(this.morphirVisualizerUrl);
      await this.networkClient.post(
        this.morphirVisualizerUrl,
        fileNode.content,
      );
    };

  visualizeBosque =
    (
      fileGenerationState: FileGenerationState,
      fileNode: GenerationFile,
    ): (() => void) =>
    async (): Promise<void> => {
      assertNonEmptyString(this.linterServerUrl);
      assertNonEmptyString(this.linterAppUrl);
      const code =
        fileGenerationState.editorStore.graphManagerState.graphManager.graphToPureCode(
          fileGenerationState.editorStore.graphManagerState.graph,
        );
      await this.networkClient.post(this.linterServerUrl, {
        ir: fileNode.content,
        src: await code,
      });
      window.open(this.linterAppUrl);
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

  getExtraFileGenerationScopeFilters(): FileGenerationScopeFilter[] {
    return [
      (
        fileGenerationLabel: string,
        packageableElement: PackageableElement,
      ): boolean => {
        if (fileGenerationLabel.toLowerCase() === MORPHIR_TYPE_NAME) {
          return packageableElement instanceof ConcreteFunctionDefinition;
        }
        return true;
      },
    ];
  }

  isMorphirGenerationType(fileGenerationState: FileGenerationState): boolean {
    return (
      fileGenerationState.fileGeneration.type.toLowerCase() ===
      MORPHIR_TYPE_NAME
    );
  }
}
