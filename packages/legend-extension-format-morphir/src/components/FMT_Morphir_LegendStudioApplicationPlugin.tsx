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
import {
  type DSL_LegendStudioApplicationPlugin_Extension,
  type GenerationFile,
  type FileGenerationResultViewerActionConfiguration,
  type FileGenerationScopeFilterConfiguration,
  type GeneratedFileStructureState,
  LegendStudioApplicationPlugin,
  FileGenerationState,
} from '@finos/legend-application-studio';
import {
  NetworkClient,
  guaranteeNonEmptyString,
  assertErrorThrown,
  guaranteeType,
} from '@finos/legend-shared';
import {
  type PackageableElement,
  ConcreteFunctionDefinition,
} from '@finos/legend-graph';

const MORPHIR_TYPE_NAME = `morphir`;

type FMT_Morphir_LegendStudioApplicationPluginConfigData = {
  visualizer: { url: string };
  linterServer: { url: string };
  linterApp: { url: string };
};

export class FMT_Morphir_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  networkClient: NetworkClient;
  private _morphirVisualizerUrl?: string | undefined;
  private _linterServerUrl?: string | undefined;
  private _linterAppUrl?: string | undefined;

  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
    this.networkClient = new NetworkClient();
  }

  override configure(
    configData: FMT_Morphir_LegendStudioApplicationPluginConfigData,
  ): FMT_Morphir_LegendStudioApplicationPlugin {
    this._morphirVisualizerUrl = guaranteeNonEmptyString(
      configData.visualizer.url,
      `Can't configure Morphir generator: 'visualizer.url' field is missing or empty`,
    );
    this._linterServerUrl = guaranteeNonEmptyString(
      configData.linterServer.url,
      `Can't configure Morphir generator: 'linterServer.url' field is missing or empty`,
    );
    this._linterAppUrl = guaranteeNonEmptyString(
      configData.linterApp.url,
      `Can't configure Morphir generator: 'linterApp.url' field is missing or empty`,
    );

    return this;
  }

  get morphirVisualizerUrl(): string {
    return guaranteeNonEmptyString(
      this._morphirVisualizerUrl,
      `Morphir visualizer URL has not been configured`,
    );
  }

  get linterServerUrl(): string {
    return guaranteeNonEmptyString(
      this._linterServerUrl,
      `Morphir linter server URL has not been configured`,
    );
  }

  get linterAppUrl(): string {
    return guaranteeNonEmptyString(
      this._linterAppUrl,
      `Morphir linter application URL has not been configured`,
    );
  }

  getExtraFileGenerationResultViewerActionConfigurations(): FileGenerationResultViewerActionConfiguration[] {
    return [
      {
        key: 'visualize-morphir-IR-action',
        renderer: (
          generatedFileStructureState: GeneratedFileStructureState,
        ): React.ReactNode | undefined => {
          if (generatedFileStructureState instanceof FileGenerationState) {
            const fileGenerationState = guaranteeType(
              generatedFileStructureState,
              FileGenerationState,
            );
            const fileNode = fileGenerationState.fileSystemState.selectedNode
              ?.fileNode as GenerationFile;
            const applicationStore =
              fileGenerationState.editorStore.applicationStore;
            const visualizeMorphir =
              (file: GenerationFile): (() => void) =>
              async (): Promise<void> => {
                try {
                  await this.networkClient.post(
                    this.morphirVisualizerUrl,
                    file.content,
                  );
                  applicationStore.navigationService.visitAddress(
                    this.morphirVisualizerUrl,
                  );
                } catch (error) {
                  assertErrorThrown(error);
                  applicationStore.notifyError(error);
                }
              };
            if (
              fileGenerationState.fileGeneration.type.toLowerCase() ===
              MORPHIR_TYPE_NAME
            ) {
              return (
                <div className="panel__header__title__content generation-result-viewer__file__header__action">
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
          }
          return undefined;
        },
      },
      {
        key: 'view-bosque-feedback-action',
        renderer: (
          generatedFileStructureState: GeneratedFileStructureState,
        ): React.ReactNode | undefined => {
          if (generatedFileStructureState instanceof FileGenerationState) {
            const fileGenerationState = guaranteeType(
              generatedFileStructureState,
              FileGenerationState,
            );
            const fileNode = fileGenerationState.fileSystemState.selectedNode
              ?.fileNode as GenerationFile;
            const applicationStore =
              fileGenerationState.editorStore.applicationStore;
            const visualizeBosque =
              (
                fileGenState: FileGenerationState,
                file: GenerationFile,
              ): (() => void) =>
              async (): Promise<void> => {
                try {
                  const code =
                    fileGenState.editorStore.graphManagerState.graphManager.graphToPureCode(
                      fileGenState.editorStore.graphManagerState.graph,
                    );
                  await this.networkClient.post(this.linterServerUrl, {
                    ir: file.content,
                    src: await code,
                  });
                  applicationStore.navigationService.visitAddress(
                    this.linterAppUrl,
                  );
                } catch (error) {
                  assertErrorThrown(error);
                  applicationStore.notifyError(error);
                }
              };
            if (
              fileGenerationState.fileGeneration.type.toLowerCase() ===
              MORPHIR_TYPE_NAME
            ) {
              return (
                <div className="panel__header__title__content generation-result-viewer__file__header__action">
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
          }
          return undefined;
        },
      },
    ];
  }

  getExtraFileGenerationScopeFilterConfigurations(): FileGenerationScopeFilterConfiguration[] {
    return [
      {
        type: MORPHIR_TYPE_NAME,
        filter: (packageableElement: PackageableElement): boolean =>
          packageableElement instanceof ConcreteFunctionDefinition,
      },
    ];
  }
}
