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
import { clsx } from '@finos/legend-studio-components';
import { FaCheckSquare, FaSquare } from 'react-icons/fa';
import { useEditorStore } from '../../../stores/EditorStore';
import { isValidUrl } from '@finos/legend-studio-shared';

export const DevTool = observer(() => {
  const editorStore = useEditorStore();
  // Engine
  const engineConfig = editorStore.graphState.graphManager.getEngineConfig();
  const changeEngineClientBaseUrl: React.ChangeEventHandler<HTMLInputElement> =
    (event) =>
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
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Engine client request payload compression
            </div>
            <div
              className={clsx('panel__content__form__section__toggler')}
              onClick={toggleEngineClientRequestPayloadCompression}
            >
              <button
                className={clsx('panel__content__form__section__toggler__btn', {
                  'panel__content__form__section__toggler__btn--toggled':
                    engineConfig.useClientRequestPayloadCompression,
                })}
              >
                {engineConfig.useClientRequestPayloadCompression ? (
                  <FaCheckSquare />
                ) : (
                  <FaSquare />
                )}
              </button>
              <div className="panel__content__form__section__toggler__prompt">
                Specifies if request payload should be compressed
              </div>
            </div>
          </div>
          <div className="panel__content__form__section">
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
          </div>
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Engine execution runner
            </div>
            <div
              className={clsx('panel__content__form__section__toggler')}
              onClick={toggleDataUrlEncoding}
            >
              <button
                className={clsx('panel__content__form__section__toggler__btn', {
                  'panel__content__form__section__toggler__btn--toggled':
                    engineConfig.useBase64ForAdhocConnectionDataUrls,
                })}
              >
                {engineConfig.useBase64ForAdhocConnectionDataUrls ? (
                  <FaCheckSquare />
                ) : (
                  <FaSquare />
                )}
              </button>
              <div className="panel__content__form__section__toggler__prompt">
                Use Base64 encoding for adhoc connection data URLs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
