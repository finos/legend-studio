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
  PanelForm,
  PanelSection,
  PanelFormBooleanEditor,
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
  const changeEngineClientBaseUrl: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) =>
    engineConfig.setBaseUrl(
      event.target.value === '' ? undefined : event.target.value,
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
    <div className="console-panel">
      <div className="console-panel__content">
        <PanelForm>
          <PanelSection>
            <PanelFormBooleanEditor
              name="Engine client request payload compression"
              description="Specifies if request payload should be compressed"
              value={engineConfig.useClientRequestPayloadCompression}
              isReadOnly={false}
              update={toggleEngineClientRequestPayloadCompression}
            />
            {/* TODO: switch out with panel text group after merge  */}
            <div className="panel__content__form__section__header__label">
              Engine client base URL
            </div>
            <div className="input-group">
              <input
                className="panel__content__form__section__input input-group__input input--dark"
                spellCheck={false}
                value={engineConfig.baseUrl ?? ''}
                onChange={changeEngineClientBaseUrl}
              />
              {!isValidUrl(engineConfig.baseUrl ?? '') && (
                <div className="input-group__error-message">Invalid URL</div>
              )}
            </div>
            <PanelFormBooleanEditor
              name="Engine execution runner"
              description="  Use Base64 encoding for adhoc connection data URLs"
              value={engineConfig.useClientRequestPayloadCompression}
              isReadOnly={false}
              update={toggleDataUrlEncoding}
            />
          </PanelSection>
        </PanelForm>
      </div>
    </div>
  );
});
