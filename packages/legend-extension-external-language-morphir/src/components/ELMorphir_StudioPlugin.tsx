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

import packageJson from '../../package.json';

import type {
  DSL_LegendStudioPlugin_Extension,
  GenerationFile,
  FileGenerationState,
  LegendStudioPluginManager,
  FileGenerationResultViewerAction,
  FileGenerationScopeFilter,
} from '@finos/legend-studio';

import { LegendStudioPlugin } from '@finos/legend-studio';
import {
  NetworkClient,
  assertNonEmptyString,
  guaranteeNonEmptyString,
} from '@finos/legend-shared';
import type { PackageableElement } from '@finos/legend-graph';
import { ConcreteFunctionDefinition } from '@finos/legend-graph';

const MORPHIR_TYPE_NAME = `morphir`;

interface ELMorphir_GenerationPluginConfigData {
  morphirVisualizerUrl: string;
  linterServerUrl: string;
  linterAppUrl: string;
}

export class ELMorphir_GenerationPlugin
  extends LegendStudioPlugin
  implements DSL_LegendStudioPlugin_Extension
{
  networkClient: NetworkClient;
  private _morphirVisualizerUrl?: string | undefined;
  private _linterServerUrl?: string | undefined;
  private _linterAppUrl?: string | undefined;

  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
    this.networkClient = new NetworkClient();
  }

  install(pluginManager: LegendStudioPluginManager): void {
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

  set morphirVisualizerUrl(url: string) {
    this._morphirVisualizerUrl = url;
  }

  get morphirVisualizerUrl(): string {
    return guaranteeNonEmptyString(this._morphirVisualizerUrl);
  }

  set linterServerUrl(url: string) {
    this._linterServerUrl = url;
  }

  get linterServerUrl(): string {
    return guaranteeNonEmptyString(this._linterServerUrl);
  }

  set linterAppUrl(url: string) {
    this._linterAppUrl = url;
  }

  get linterAppUrl(): string {
    return guaranteeNonEmptyString(this._linterAppUrl);
  }

  getExtraFileGenerationResultViewerActions(): FileGenerationResultViewerAction[] {
    const visualizeMorphir =
      (fileNode: GenerationFile): (() => void) =>
      async (): Promise<void> => {
        window.open(this.morphirVisualizerUrl);
        await this.networkClient.post(
          this.morphirVisualizerUrl,
          fileNode.content,
        );
      };
    const visualizeBosque =
      (
        fileGenerationState: FileGenerationState,
        fileNode: GenerationFile,
      ): (() => void) =>
      async (): Promise<void> => {
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
    return [
      (
        fileGenerationState: FileGenerationState,
      ): React.ReactNode | undefined => {
        const fileNode = fileGenerationState.selectedNode
          ?.fileNode as GenerationFile;
        if (this.isMorphirGenerationType(fileGenerationState)) {
          return (
            <div className="panel__header__title__content generation-result-viewer__file__header-button">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                onClick={visualizeMorphir(fileNode)}
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
      ): React.ReactNode | undefined => {
        const fileNode = fileGenerationState.selectedNode
          ?.fileNode as GenerationFile;
        if (this.isMorphirGenerationType(fileGenerationState)) {
          return (
            <div className="panel__header__title__content generation-result-viewer__file__header-button">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                onClick={visualizeBosque(fileGenerationState, fileNode)}
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
        fileGenerationType: string,
        packageableElement: PackageableElement,
      ): boolean => {
        if (fileGenerationType.toLowerCase() === MORPHIR_TYPE_NAME) {
          return packageableElement instanceof ConcreteFunctionDefinition;
        }
        return true;
      },
    ];
  }

  private isMorphirGenerationType(
    fileGenerationState: FileGenerationState,
  ): boolean {
    return (
      fileGenerationState.fileGeneration.type.toLowerCase() ===
      MORPHIR_TYPE_NAME
    );
  }
}
