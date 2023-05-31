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
} from '@finos/legend-art';
import { isValidUrl } from '@finos/legend-shared';
import { useEditorStore } from '../EditorStoreProvider.js';
import { LEGEND_STUDIO_SETTING_KEY } from '../../../__lib__/LegendStudioSetting.js';

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
      </PanelForm>
    </Panel>
  );
});
