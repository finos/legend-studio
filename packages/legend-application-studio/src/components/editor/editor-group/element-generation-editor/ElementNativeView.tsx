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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import type { ElementEditorState } from '../../../../stores/editor/editor-state/element-editor-state/ElementEditorState.js';
import { ELEMENT_NATIVE_VIEW_MODE } from '../../../../stores/editor/EditorConfig.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';

export const ElementNativeView = observer(
  (props: { currentElementState: ElementEditorState }) => {
    const { currentElementState } = props;
    const applicationStore = useApplicationStore();
    const generatedText = currentElementState.textContent;
    const editorLanguage =
      currentElementState.editMode === ELEMENT_NATIVE_VIEW_MODE.GRAMMAR
        ? CODE_EDITOR_LANGUAGE.PURE
        : CODE_EDITOR_LANGUAGE.JSON;

    useEffect(() => {
      switch (currentElementState.editMode) {
        case ELEMENT_NATIVE_VIEW_MODE.JSON:
          currentElementState.generateElementProtocol();
          break;
        case ELEMENT_NATIVE_VIEW_MODE.GRAMMAR:
          flowResult(currentElementState.generateElementGrammar()).catch(
            applicationStore.alertUnhandledError,
          );
          break;
        default:
          break;
      }
    }, [applicationStore, currentElementState, currentElementState.editMode]);

    return (
      <CodeEditor
        inputValue={generatedText}
        language={editorLanguage}
        isReadOnly={true}
      />
    );
  },
);
