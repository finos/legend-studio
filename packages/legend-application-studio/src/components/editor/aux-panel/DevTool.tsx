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
  PanelSection,
  PanelFormBooleanEditor,
  Panel,
  PanelFormTextEditor,
  PanelForm,
} from '@finos/legend-art';
import { isValidUrl } from '@finos/legend-shared';
import { useEditorStore } from '../EditorStoreProvider.js';
import { observe_TEMPORARY__AbstractEngineConfig } from '@finos/legend-graph';

export const DevTool = observer(() => {
  const editorStore = useEditorStore();
  // Engine
  const engineConfig = observe_TEMPORARY__AbstractEngineConfig(
    editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig(),
  );
  const toggleEngineClientRequestPayloadCompression = (): void =>
    engineConfig.setUseClientRequestPayloadCompression(
      !engineConfig.useClientRequestPayloadCompression,
    );
  const toggleDataUrlEncoding = (): void =>
    engineConfig.setUseBase64ForAdhocConnectionDataUrls(
      !engineConfig.useBase64ForAdhocConnectionDataUrls,
    );

  return (
    <Panel>
      <PanelForm>
        <PanelSection>
          <PanelFormBooleanEditor
            name="Engine client request payload compression"
            prompt="Specifies if request payload should be compressed"
            value={engineConfig.useClientRequestPayloadCompression}
            isReadOnly={false}
            update={toggleEngineClientRequestPayloadCompression}
          />
          <PanelFormTextEditor
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
          <PanelFormBooleanEditor
            name="Engine execution runner"
            prompt="Use Base64 encoding for adhoc connection data URLs"
            value={engineConfig.useClientRequestPayloadCompression}
            isReadOnly={false}
            update={toggleDataUrlEncoding}
          />
        </PanelSection>
      </PanelForm>
    </Panel>
  );
});
