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

import { useMemo } from 'react';
import {
  type editor as monacoEditorAPI,
  type IKeyboardEvent,
  KeyCode,
} from 'monaco-editor';
import {
  type TextInputEditorOnKeyDownEventHandler,
  type EDITOR_LANGUAGE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import { useEditorStore } from '../editor/EditorStoreProvider';

export const StudioTextInputEditor: React.FC<{
  inputValue: string;
  isReadOnly?: boolean | undefined;
  language: EDITOR_LANGUAGE;
  showMiniMap?: boolean | undefined;
  hideGutter?: boolean | undefined;
  extraEditorOptions?: monacoEditorAPI.IEditorOptions &
    monacoEditorAPI.IGlobalEditorOptions;
  updateInput?: ((val: string) => void) | undefined;
}> = (props) => {
  const {
    inputValue,
    isReadOnly,
    updateInput,
    language,
    showMiniMap,
    hideGutter,
    extraEditorOptions,
  } = props;

  const applicationStore = useApplicationStore();
  const editorStore = useEditorStore();

  const onKeyDownEventHandlers: TextInputEditorOnKeyDownEventHandler[] =
    useMemo(
      () => [
        {
          matcher: (event: IKeyboardEvent): boolean =>
            event.keyCode === KeyCode.F8,
          action: (event: IKeyboardEvent): void => {
            flowResult(editorStore.toggleTextMode()).catch(
              applicationStore.alertUnhandledError,
            );
          },
        },
      ],
      [applicationStore, editorStore],
    );

  return (
    <TextInputEditor
      inputValue={inputValue}
      updateInput={updateInput}
      isReadOnly={isReadOnly}
      language={language}
      showMiniMap={showMiniMap}
      hideGutter={hideGutter}
      extraEditorOptions={extraEditorOptions}
      onKeyDownEventHandlers={onKeyDownEventHandlers}
    />
  );
};
