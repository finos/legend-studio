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

import React, { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from 'Stores/EditorStore';
import { TextEditorState } from 'Stores/editor-state/element-editor-state/TextEditorState';
import { DropdownMenu } from 'Components/shared/DropdownMenu';
import { prettyCONSTName } from 'Utilities/FormatterUtil';
import { EDITOR_LANGUAGE } from 'Stores/EditorConfig';
import { FaLock, FaCaretDown } from 'react-icons/fa';
import { TextInputEditor } from 'Components/shared/TextInputEditor';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { TEXT_TYPE } from 'MM/model/packageableElements/text/Text';

const getTextElementEditorLanguage = (type: TEXT_TYPE): EDITOR_LANGUAGE => {
  switch (type) {
    case TEXT_TYPE.MARKDOWN: return EDITOR_LANGUAGE.MARKDOWN;
    case TEXT_TYPE.PLAIN_TEXT: return EDITOR_LANGUAGE.TEXT;
    default: throw new UnsupportedOperationError(`Unsupported text content type '${type}'`);
  }
};

export const TextElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const textEditorState = editorStore.getCurrentEditorState(TextEditorState);
  const textElement = textEditorState.textElement;
  const isReadOnly = textEditorState.isReadOnly;
  const typeNameRef = useRef<HTMLInputElement>(null);
  const changeType = (val: TEXT_TYPE): () => void => (): void => { !isReadOnly && textElement.setType(val) };
  const changeContent = (val: string): void => textElement.setContent(val);

  useEffect(() => { if (!isReadOnly) { typeNameRef.current?.focus() } }, [isReadOnly]);

  return (
    <div className="panel text-element-editor">
      <div className="panel__header text-element-editor__header">
        <div className="text-element-editor__header__configs">
          {isReadOnly && <div className="text-element-editor__header__lock"><FaLock /></div>}
          <DropdownMenu
            disabled={isReadOnly}
            className="edit-panel__element-view"
            content={
              <div className="text-element-editor__header__configs__options">
                {Object.values(TEXT_TYPE).map(mode =>
                  <div key={mode} className="text-element-editor__header__configs__option" onClick={changeType(mode)}>
                    {prettyCONSTName(mode)}
                  </div>
                )}
              </div>
            }
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'right' }
            }}
          >
            <div className="text-element-editor__header__configs__type">
              <div className="text-element-editor__header__configs__type__label">
                {prettyCONSTName(textElement.type)}
              </div>
              <div className="text-element-editor__header__configs__type__icon">
                <FaCaretDown />
              </div>
            </div>
          </DropdownMenu>
        </div>
      </div>
      <div className="panel__content text-element-editor__editor">
        <TextInputEditor language={getTextElementEditorLanguage(textElement.type)} inputValue={textElement.content} updateInput={changeContent} />
      </div>
    </div>
  );
});
