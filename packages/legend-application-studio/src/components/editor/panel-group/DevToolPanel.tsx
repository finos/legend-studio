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

import { observer } from 'mobx-react-lite';
import {
  PanelFormBooleanField,
  Panel,
  PanelFormTextField,
  PanelForm,
  CloudDownloadIcon,
  PanelFormListItems,
} from '@finos/legend-art';
import {
  ContentType,
  downloadFileUsingDataURI,
  getContentTypeFileExtension,
  isValidUrl,
} from '@finos/legend-shared';
import { useEditorStore } from '../EditorStoreProvider.js';
import { LEGEND_STUDIO_SETTING_KEY } from '../../../__lib__/LegendStudioSetting.js';
import { flowResult } from 'mobx';
import {
  PARSER_SECTION_MARKER,
  PURE_PARSER,
  type PureModel,
} from '@finos/legend-graph';

export const DevToolPanel = observer(() => {
  const editorStore = useEditorStore();
  // Engine
  const engineConfig =
    editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
  const toggleEngineClientRequestPayloadCompression = (): void =>
    engineConfig.setUseClientRequestPayloadCompression(
      !engineConfig.useClientRequestPayloadCompression,
    );
  const toggleEngineClientRequestPayloadDebugging = (): void =>
    engineConfig.setEnableDebuggingPayload(
      !engineConfig.enableDebuggingPayload,
    );
  const toggleEngineClientDataURLEncoding = (): void =>
    engineConfig.setUseBase64ForAdhocConnectionDataUrls(
      !engineConfig.useBase64ForAdhocConnectionDataUrls,
    );

  const toggleSetUseDevClientProtocol = (): void =>
    engineConfig.setUseDevClientProtocol(!engineConfig.useDevClientProtocol);

  // Graph Manager
  const toggleStrictMode = (): void => {
    editorStore.graphState.setEnableStrictMode(
      !editorStore.graphState.enableStrictMode,
    );
    editorStore.applicationStore.settingService.persistValue(
      LEGEND_STUDIO_SETTING_KEY.EDITOR_STRICT_MODE,
      editorStore.graphState.enableStrictMode,
    );
  };
  const toggleArtifactGeneration = (): void => {
    editorStore.graphState.graphGenerationState.setEnableArtifactGeneration(
      !editorStore.graphState.graphGenerationState.enableArtifactGeneration,
    );
  };

  const downloadDependencyProjectGrammars = async (): Promise<string[]> => {
    const grammars = await Promise.all(
      Array.from(
        editorStore.graphManagerState.graph.dependencyManager
          .projectDependencyModelsIndex,
      ).map(
        (graph) =>
          flowResult(
            editorStore.graphManagerState.graphManager.graphToPureCode(
              graph[1] as PureModel,
              {
                pretty: true,
              },
            ),
          ) as string,
      ),
    );
    return grammars;
  };

  const downloadProjectGrammar = async (
    withDependency: boolean,
  ): Promise<void> => {
    const graphGrammar = (await Promise.all([
      flowResult(
        editorStore.graphManagerState.graphManager.graphToPureCode(
          editorStore.graphManagerState.graph,
          { pretty: true },
        ),
      ),
    ])) as unknown as string;
    const dependencyGrammars = withDependency
      ? ((await Promise.all([
          flowResult(downloadDependencyProjectGrammars()),
        ])) as unknown as string[])
      : [];
    const fullGrammar = [graphGrammar, ...dependencyGrammars].join(
      `\n${PARSER_SECTION_MARKER}${PURE_PARSER.PURE}\n`,
    );
    const fileName = `grammar.${getContentTypeFileExtension(
      ContentType.TEXT_PLAIN,
    )}`;
    downloadFileUsingDataURI(
      fileName,
      `${fullGrammar}`,
      ContentType.TEXT_PLAIN,
    );
  };

  return (
    <Panel>
      <PanelForm>
        <PanelFormBooleanField
          name="Engine client request payload compression"
          prompt="Specifies if request payload should be compressed"
          value={engineConfig.useClientRequestPayloadCompression}
          isReadOnly={false}
          update={toggleEngineClientRequestPayloadCompression}
        />
        <PanelFormBooleanField
          name="Engine client request payload debug"
          prompt="Specifies if request payload should be downloaded for debugging purpose"
          value={engineConfig.enableDebuggingPayload}
          isReadOnly={false}
          update={toggleEngineClientRequestPayloadDebugging}
        />
        <PanelFormTextField
          name="Engine client base URL"
          value={engineConfig.baseUrl ?? ''}
          isReadOnly={false}
          update={(value: string | undefined): void =>
            engineConfig.setBaseUrl(value === '' ? undefined : value)
          }
          errorMessage={
            !isValidUrl(engineConfig.baseUrl ?? '') ? 'Invalid URL' : ''
          }
        />
        <PanelFormBooleanField
          name="Use Dev client protocol version"
          prompt="Specifies if development client porotocl (v_X_X_X) version should be used for execution"
          value={engineConfig.useDevClientProtocol}
          isReadOnly={false}
          update={toggleSetUseDevClientProtocol}
        />
        {Boolean(
          editorStore.applicationStore.config.options
            .TEMPORARY__serviceRegistrationConfig.length,
        ) && (
          <PanelFormTextField
            name="Engine client service registration base URL"
            value={engineConfig.baseUrlForServiceRegistration ?? ''}
            isReadOnly={false}
            update={(value: string | undefined): void =>
              engineConfig.setBaseUrlForServiceRegistration(
                value === '' ? undefined : value,
              )
            }
            errorMessage={
              Boolean(engineConfig.baseUrlForServiceRegistration) &&
              !isValidUrl(engineConfig.baseUrlForServiceRegistration ?? '')
                ? 'Invalid URL'
                : ''
            }
          />
        )}
        <PanelFormBooleanField
          name="Engine execution runner"
          prompt="Use Base64 encoding for adhoc connection data URLs"
          value={engineConfig.useBase64ForAdhocConnectionDataUrls}
          isReadOnly={false}
          update={toggleEngineClientDataURLEncoding}
        />
        <PanelFormBooleanField
          name="Graph builder strict mode"
          prompt="Use strict-mode when building the graph (some warnings will be treated as errors)"
          value={editorStore.graphState.enableStrictMode}
          isReadOnly={false}
          update={toggleStrictMode}
        />
        <PanelFormBooleanField
          name="Generate Artifact Generations"
          prompt="Include generation of artifact extensions during generation action (F10)"
          value={
            editorStore.graphState.graphGenerationState.enableArtifactGeneration
          }
          isReadOnly={false}
          update={toggleArtifactGeneration}
        />
        <PanelFormListItems title="Download Project Grammar">
          <div className="developer-tools__action-groups">
            <div className="developer-tools__action-group">
              <button
                className="developer-tools__action-group__btn"
                onClick={() => {
                  downloadProjectGrammar(false).catch(
                    editorStore.applicationStore.alertUnhandledError,
                  );
                }}
                tabIndex={-1}
                title="Download Project Grammar"
              >
                <CloudDownloadIcon />
              </button>
              <div className="developer-tools__action-group__prompt">
                download grammar without dependency
              </div>
            </div>
            <div className="developer-tools__action-group">
              <button
                className="developer-tools__action-group__btn"
                onClick={() => {
                  downloadProjectGrammar(true).catch(
                    editorStore.applicationStore.alertUnhandledError,
                  );
                }}
                tabIndex={-1}
                title="Download Project Grammar with Dependency"
              >
                <CloudDownloadIcon />
              </button>
              <div className="developer-tools__action-group__prompt">
                download grammar with dependency
              </div>
            </div>
          </div>
        </PanelFormListItems>
      </PanelForm>
    </Panel>
  );
});
