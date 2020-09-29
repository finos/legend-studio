/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import clsx from 'clsx';
import { FaCheckSquare, FaSquare } from 'react-icons/fa';
import { useEditorStore } from 'Stores/EditorStore';

export const DevTool = observer(() => {
  const editorStore = useEditorStore();
  const devToolState = editorStore.devToolState;
  const toggleDataCompression = (): void => devToolState.setNetworkCallWithDataCompression(!devToolState.isNetworkCallWithDataCompressionEnabled);

  return (
    <div className="console-panel">
      <div className="console-panel__content">
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">Payload compression</div>
            <div className={clsx('panel__content__form__section__toggler')} onClick={toggleDataCompression}>
              <button
                className={clsx('panel__content__form__section__toggler__btn', { 'panel__content__form__section__toggler__btn--toggled': devToolState.isNetworkCallWithDataCompressionEnabled })}
              >{devToolState.isNetworkCallWithDataCompressionEnabled ? <FaCheckSquare /> : <FaSquare />}</button>
              <div className="panel__content__form__section__toggler__prompt">Specifies if network POST request payload should be compressed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

