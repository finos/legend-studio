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
  BlankPanelContent,
  Button,
  LockIcon,
  Panel,
  PanelContent,
  PanelHeader,
} from '@finos/legend-art';
import { UnsupportedElementEditorState } from '../../../stores/editor/editor-state/UnsupportedElementEditorState.js';
import { flowResult } from 'mobx';
import { useEditorStore } from '../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { ELEMENT_NATIVE_VIEW_MODE } from '../../../stores/editor/EditorConfig.js';
import { INTERNAL__UnknownElement } from '@finos/legend-graph';
import { isType } from '@finos/legend-shared';

export const UnsupportedEditorPanel = observer(
  (props: {
    text: string;
    isReadOnly: boolean;
    unsupportedElementEditorState?: UnsupportedElementEditorState;
  }) => {
    const { text, isReadOnly, unsupportedElementEditorState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();

    const isUnknownEntity = unsupportedElementEditorState
      ? isType(unsupportedElementEditorState.element, INTERNAL__UnknownElement)
      : false;

    const handleTextModeClick = applicationStore.guardUnhandledError(() =>
      flowResult(editorStore.toggleTextMode()),
    );

    const handleJsonModeClick = (): void => {
      unsupportedElementEditorState?.setEditMode(ELEMENT_NATIVE_VIEW_MODE.JSON);
    };

    return (
      <BlankPanelContent>
        <div className="unsupported-element-editor__main">
          <div className="unsupported-element-editor__summary">{text}</div>
          <div className="unsupported-element-editor__actions">
            {!isReadOnly && (
              <Button
                className="unsupported-element-editor__to-text-mode__btn"
                onClick={handleTextModeClick}
                text="Edit in text mode"
                disabled={isUnknownEntity}
              />
            )}
            {isUnknownEntity && (
              <Button
                className="unsupported-element-editor__to-text-mode__btn unsupported-element-editor__btn--dark"
                onClick={handleJsonModeClick}
                text="View content"
              />
            )}
          </div>
        </div>
      </BlankPanelContent>
    );
  },
);

// NOTE: this editor can be used for any element supported via text mode but no editor has been built
export const UnsupportedElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const unsupportedElementEditorState =
    editorStore.tabManagerState.getCurrentEditorState(
      UnsupportedElementEditorState,
    );
  const element = unsupportedElementEditorState.element;
  const isReadOnly = unsupportedElementEditorState.isReadOnly;

  return (
    <div className="unsupported-element-editor">
      <Panel>
        <PanelHeader>
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">element</div>
            <div className="panel__header__title__content">{element.name}</div>
          </div>
        </PanelHeader>
        <PanelContent className="unsupported-element-editor__content">
          <UnsupportedEditorPanel
            text="Can't display this element in form-mode"
            isReadOnly={isReadOnly}
            unsupportedElementEditorState={unsupportedElementEditorState}
          />
        </PanelContent>
      </Panel>
    </div>
  );
});
