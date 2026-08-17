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
import { PARSER_SECTION_MARKER, PURE_PARSER } from '@finos/legend-graph';
import { ProjectDependencyCoordinates } from '@finos/legend-server-depot';

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

  const downloadProjectGrammar = async (
    withDependency: boolean,
  ): Promise<void> => {
    const graphManager = editorStore.graphManagerState.graphManager;
    const graphGrammar = await graphManager.graphToPureCode(
      editorStore.graphManagerState.graph,
      { pretty: true },
    );
    let dependencyGrammar: string | undefined;
    if (withDependency) {
      // Fetch the dependency graph directly from Depot as a
      // `V1_PureModelContextData` payload and hand it straight to the engine
      // grammar transform. This skips building a `PureModel` for dependencies
      // and collapses the whole dependency graph into a single engine call.
      const projectDependencies =
        editorStore.projectConfigurationEditorState.currentProjectConfiguration
          .projectDependencies;
      if (projectDependencies.length) {
        const dependencyCoordinates =
          await editorStore.graphState.buildProjectDependencyCoordinates(
            projectDependencies,
          );
        const dependencyProtocolGraph =
          await editorStore.depotServerClient.collectDependencyEntitiesAsPureModelContextData(
            dependencyCoordinates.map((e) =>
              ProjectDependencyCoordinates.serialization.toJson(e),
            ),
            true,
            true,
          );
        dependencyGrammar = await graphManager.protocolToPureCode(
          dependencyProtocolGraph,
          { pretty: true },
        );
      }
    }
    const fullGrammar =
      dependencyGrammar === undefined
        ? graphGrammar
        : `${graphGrammar}\n${PARSER_SECTION_MARKER}${PURE_PARSER.PURE}\n// ------------------------------------------------------------\n// Dependency grammar starts here\n// ------------------------------------------------------------\n${dependencyGrammar}`;
    const fileName = `grammar.${getContentTypeFileExtension(
      ContentType.TEXT_PLAIN,
    )}`;
    downloadFileUsingDataURI(fileName, fullGrammar, ContentType.TEXT_PLAIN);
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
          prompt="Specifies if development client protocol (v_X_X_X) version should be used for execution"
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
            <div
              className="developer-tools__action-group"
              onClick={() => {
                downloadProjectGrammar(false).catch(
                  editorStore.applicationStore.alertUnhandledError,
                );
              }}
              role="button"
              tabIndex={-1}
              title="Download Project Grammar"
            >
              <button
                className="developer-tools__action-group__btn"
                tabIndex={-1}
              >
                <CloudDownloadIcon />
              </button>
              <div className="developer-tools__action-group__prompt">
                download grammar without dependency
              </div>
            </div>
            <div
              className="developer-tools__action-group"
              onClick={() => {
                downloadProjectGrammar(true).catch(
                  editorStore.applicationStore.alertUnhandledError,
                );
              }}
              role="button"
              tabIndex={-1}
              title="Download Project Grammar with Dependency"
            >
              <button
                className="developer-tools__action-group__btn"
                tabIndex={-1}
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
