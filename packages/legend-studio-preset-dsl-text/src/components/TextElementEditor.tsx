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

import { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  prettyCONSTName,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import {
  useEditorStore,
  EDITOR_LANGUAGE,
  TextInputEditor,
} from '@finos/legend-studio';
import { TextEditorState } from '../stores/TextEditorState';
import {
  LockIcon,
  CaretDownIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
} from '@finos/legend-studio-components';
import { TEXT_TYPE } from '../models/metamodels/pure/model/packageableElements/Text';

const getTextElementEditorLanguage = (type: TEXT_TYPE): EDITOR_LANGUAGE => {
  switch (type) {
    case TEXT_TYPE.MARKDOWN:
      return EDITOR_LANGUAGE.MARKDOWN;
    case TEXT_TYPE.PLAIN_TEXT:
      return EDITOR_LANGUAGE.TEXT;
    default:
      throw new UnsupportedOperationError(
        `Can't derive text editor format for text content of type '${type}'`,
      );
  }
};

export const TextElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const textEditorState = editorStore.getCurrentEditorState(TextEditorState);
  const textElement = textEditorState.textElement;
  const isReadOnly = textEditorState.isReadOnly;
  const typeNameRef = useRef<HTMLInputElement>(null);
  const changeType =
    (val: TEXT_TYPE): (() => void) =>
    (): void => {
      !isReadOnly && textElement.setType(val);
    };
  const changeContent = (val: string): void => textElement.setContent(val);

  useEffect(() => {
    if (!isReadOnly) {
      typeNameRef.current?.focus();
    }
  }, [isReadOnly]);

  return (
    <div className="panel text-element-editor">
      <div className="panel__header text-element-editor__header">
        <div className="text-element-editor__header__configs">
          {isReadOnly && (
            <div className="text-element-editor__header__lock">
              <LockIcon />
            </div>
          )}
          <DropdownMenu
            disabled={isReadOnly}
            className="edit-panel__element-view"
            content={
              <MenuContent>
                {Object.values(TEXT_TYPE).map((mode) => (
                  <MenuContentItem
                    key={mode}
                    className="text-element-editor__header__configs__option"
                    onClick={changeType(mode)}
                  >
                    {prettyCONSTName(mode)}
                  </MenuContentItem>
                ))}
              </MenuContent>
            }
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'right' },
            }}
          >
            <div className="text-element-editor__header__configs__type">
              <div className="text-element-editor__header__configs__type__label">
                {prettyCONSTName(textElement.type)}
              </div>
              <div className="text-element-editor__header__configs__type__icon">
                <CaretDownIcon />
              </div>
            </div>
          </DropdownMenu>
        </div>
      </div>
      <div className="panel__content text-element-editor__editor">
        <TextInputEditor
          language={getTextElementEditorLanguage(textElement.type)}
          inputValue={textElement.content}
          updateInput={changeContent}
        />
      </div>
    </div>
  );
});
