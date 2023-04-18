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
import type { FlatDataConnectionValueState } from '../../../../stores/editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { flatDataConnection_setUrl } from '../../../../stores/graph-modifier/STO_FlatData_GraphModifierHelper.js';

export const FlatDataConnectionEditor = observer(
  (props: {
    connectionValueState: FlatDataConnectionValueState;
    isReadOnly: boolean;
  }) => {
    const { connectionValueState, isReadOnly } = props;
    const connection = connectionValueState.connection;
    // url
    const changeUrl: React.ChangeEventHandler<HTMLTextAreaElement> = (event) =>
      flatDataConnection_setUrl(connection, event.target.value);
    return (
      <div className="panel__content__form">
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            URL
          </div>
          <div className="panel__content__form__section__header__prompt">
            Specifies the connection URL
          </div>
          <textarea
            className="panel__content__form__section__textarea connection-editor__model-connection-url__textarea"
            spellCheck={false}
            value={connection.url}
            onChange={changeUrl}
            disabled={isReadOnly}
          />
        </div>
      </div>
    );
  },
);
