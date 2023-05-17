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
import { FlatDataConnectionEditor } from './FlatDataConnectionEditor.js';
import { RelationalDatabaseConnectionWrapperEditor } from './RelationalDatabaseConnectionEditor.js';
import {
  type ConnectionEditorState,
  RelationalDatabaseConnectionValueState,
  JsonModelConnectionValueState,
  FlatDataConnectionValueState,
  PackageableConnectionEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import type { Class } from '@finos/legend-graph';
import { CustomSelectorInput, LockIcon, PanelContent } from '@finos/legend-art';
import { useEditorStore } from '../../EditorStoreProvider.js';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import {
  modelConnection_setClass,
  modelConnection_setUrl,
} from '../../../../stores/graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
} from '@finos/legend-lego/graph-editor';

import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';

const ModelConnectionEditor = observer(
  (props: {
    connectionValueState: JsonModelConnectionValueState; // should support XMLModelConnection as well
    isReadOnly: boolean;
    disableChangingClass?: boolean | undefined;
  }) => {
    const { connectionValueState, isReadOnly, disableChangingClass } = props;
    const connection = connectionValueState.connection;
    const editorStore = useEditorStore();
    // classOptions
    const classOptions =
      editorStore.graphManagerState.usableClasses.map(buildElementOption);
    const sourceClass = connection.class.value;
    const onSourceClassChange = (val: { label: string; value: Class }): void =>
      modelConnection_setClass(connection, val.value);
    // TODO: handle content type (XML/JSON)
    // url
    const changeUrl: React.ChangeEventHandler<HTMLTextAreaElement> = (event) =>
      modelConnection_setUrl(connection, event.target.value);

    return (
      <div className="panel__content__form">
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            <div className="panel__content__form__section__header__label__text">
              Source Class
            </div>
            {disableChangingClass && (
              <div className="panel__content__form__section__header__label__lock">
                <LockIcon />
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
            formatOptionLabel={getPackageableElementOptionFormatter({
              darkMode: true,
            })}
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
    const editorStore = useEditorStore();
    const plugins = editorStore.pluginManager.getApplicationPlugins();

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
          <RelationalDatabaseConnectionWrapperEditor
            connectionValueState={connectionValueState}
            isReadOnly={isReadOnly}
          />
        );
      } else {
        const extraConnectionEditorRenderers = plugins.flatMap(
          (plugin) =>
            (
              plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
            ).getExtraConnectionEditorRenderers?.() ?? [],
        );
        for (const editorRenderer of extraConnectionEditorRenderers) {
          const editor = editorRenderer(connectionValueState, isReadOnly);
          if (editor) {
            return editor;
          }
        }

        return (
          <UnsupportedEditorPanel
            text="Can't display this connection in form-mode"
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
        <PanelContent>{renderConnectionValueEditor()}</PanelContent>
      </div>
    );
  },
);

export const PackageableConnectionEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    PackageableConnectionEditorState,
  );
  const isReadOnly = editorState.isReadOnly;

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CONNECTION_EDITOR,
  );

  return (
    <ConnectionEditor
      connectionEditorState={editorState.connectionState}
      isReadOnly={isReadOnly}
    />
  );
});
