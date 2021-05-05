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
import { useEditorStore } from '../../../../stores/EditorStore';
import { FlatDataConnectionEditor } from './FlatDataConnectionEditor';
import { RelationalDatabaseConnectionEditor } from './RelationalDatabaseConnectionEditor';
import {
  RelationalDatabaseConnectionValueState,
  JsonModelConnectionValueState,
  FlatDataConnectionValueState,
  PackageableConnectionEditorState,
} from '../../../../stores/editor-state/element-editor-state/ConnectionEditorState';
import type { ConnectionEditorState } from '../../../../stores/editor-state/element-editor-state/ConnectionEditorState';
import { UnsupportedEditorPanel } from '../../../editor/edit-panel/UnsupportedElementEditor';
import type { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { FaLock } from 'react-icons/fa';
import { CustomSelectorInput } from '@finos/legend-studio-components';

const ModelConnectionEditor = observer(
  (props: {
    connectionValueState: JsonModelConnectionValueState; // should support XMLModelConnection as well
    isReadOnly: boolean;
    disableChangingClass?: boolean;
  }) => {
    const { connectionValueState, isReadOnly, disableChangingClass } = props;
    const connection = connectionValueState.connection;
    const editorStore = useEditorStore();
    // classOptions
    const classOptions = editorStore.classOptions;
    const sourceClass = connection.class.value;
    const onSourceClassChange = (val: { label: string; value: Class }): void =>
      connection.setClass(val.value);
    // TODO: handle content type (XML/JSON)
    // url
    const changeUrl: React.ChangeEventHandler<HTMLTextAreaElement> = (event) =>
      connection.setUrl(event.target.value);

    return (
      <div className="panel__content__form">
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            <div className="panel__content__form__section__header__label__text">
              Source Class
            </div>
            {disableChangingClass && (
              <div className="panel__content__form__section__header__label__lock">
                <FaLock />
              </div>
            )}
          </div>
          <div className="panel__content__form__section__header__prompt">
            Specifies the class being used for the model store
          </div>
          <CustomSelectorInput
            disabled={isReadOnly || disableChangingClass}
            className="panel__content__form__section__dropdown"
            options={classOptions}
            onChange={onSourceClassChange}
            value={{ label: sourceClass.name, value: sourceClass }}
            darkMode={true}
          />
        </div>
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

export const ConnectionEditor = observer(
  (props: {
    connectionEditorState: ConnectionEditorState;
    isReadOnly: boolean;
    disableChangingStore?: boolean;
  }) => {
    const { connectionEditorState, isReadOnly, disableChangingStore } = props;
    const connectionValueState = connectionEditorState.connectionValueState;

    /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
    const renderConnectionValueEditor = (): React.ReactNode => {
      if (connectionValueState instanceof JsonModelConnectionValueState) {
        return (
          <ModelConnectionEditor
            connectionValueState={connectionValueState}
            isReadOnly={isReadOnly}
            disableChangingClass={disableChangingStore}
          />
        );
      } else if (connectionValueState instanceof FlatDataConnectionValueState) {
        return (
          <FlatDataConnectionEditor
            connectionValueState={connectionValueState}
            isReadOnly={isReadOnly}
          />
        );
      } else if (
        connectionValueState instanceof RelationalDatabaseConnectionValueState
      ) {
        return (
          <RelationalDatabaseConnectionEditor
            connectionValueState={connectionValueState}
            isReadOnly={isReadOnly}
          />
        );
      } else {
        return (
          <UnsupportedEditorPanel
            text={`Can't display this connection in form-mode`}
            isReadOnly={isReadOnly}
          />
        );
      }
    };
    return (
      <div className="panel connection-editor">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              {connectionValueState.label()}
            </div>
          </div>
        </div>
        <div className="panel__content">{renderConnectionValueEditor()}</div>
      </div>
    );
  },
);

export const PackageableConnectionEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState = editorStore.getCurrentEditorState(
    PackageableConnectionEditorState,
  );
  const isReadOnly = editorState.isReadOnly;
  return (
    <ConnectionEditor
      connectionEditorState={editorState.connectionState}
      isReadOnly={isReadOnly}
    />
  );
});
