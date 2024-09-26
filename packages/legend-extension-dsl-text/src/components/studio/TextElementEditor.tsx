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

import { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { prettyCONSTName } from '@finos/legend-shared';
import { useEditorStore } from '@finos/legend-application-studio';
import { TextEditorState } from '../../stores/studio/TextEditorState.js';
import {
  OpenPreviewIcon,
  LockIcon,
  CaretDownIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MarkdownTextViewer,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import { useApplicationNavigationContext } from '@finos/legend-application';
import {
  text_setContent,
  text_setType,
} from '../../stores/studio/DSL_Text_GraphModifierHelper.js';
import { TEXT_TYPE } from '../../graph/helpers/DSL_Text_Helper.js';
import { DSL_TEXT_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../__lib__/studio/DSL_Text_LegendStudioApplicationNavigationContext.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';

const getTextElementEditorLanguage = (
  type: string | undefined,
): CODE_EDITOR_LANGUAGE => {
  switch (type) {
    case TEXT_TYPE.MARKDOWN:
      return CODE_EDITOR_LANGUAGE.MARKDOWN;
    case TEXT_TYPE.PLAIN_TEXT:
    default:
      return CODE_EDITOR_LANGUAGE.TEXT;
  }
};

export const TextElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const textEditorState =
    editorStore.tabManagerState.getCurrentEditorState(TextEditorState);
  const textElement = textEditorState.textElement;
  const isReadOnly = textEditorState.isReadOnly;
  const typeNameRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const isPreviewSupported = textElement.type === CODE_EDITOR_LANGUAGE.MARKDOWN;

  const changeType =
    (val: TEXT_TYPE): (() => void) =>
    (): void => {
      if (!isReadOnly) {
        text_setType(textElement, val);
      }
    };
  const changeContent = (val: string): void =>
    text_setContent(textElement, val);
  const changePreview = (val: boolean): void => setShowPreview(val);

  useEffect(() => {
    if (!isReadOnly) {
      typeNameRef.current?.focus();
    }
  }, [isReadOnly]);

  useApplicationNavigationContext(
    DSL_TEXT_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.TEXT_EDITOR,
  );

  return (
    <div className="panel text-element-editor">
      <div className="panel__header text-element-editor__header">
        <div className="text-element-editor__header__configs">
          {isReadOnly && (
            <div className="text-element-editor__header__lock">
              <LockIcon />
            </div>
          )}
          <ControlledDropdownMenu
            className="text-element-editor__header__configs__type"
            disabled={isReadOnly}
            content={
              <MenuContent>
                {/* TODO: account for unknown types */}
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
            <div className="text-element-editor__header__configs__type__label">
              {prettyCONSTName(textElement.type)}
            </div>
            <div className="text-element-editor__header__configs__type__icon">
              <CaretDownIcon />
            </div>
          </ControlledDropdownMenu>
          {isPreviewSupported ? (
            <button
              title={showPreview ? `Hide Preview` : `Show Preview`}
              className={`text-element-editor__preview-btn ${
                showPreview ? `text-element-editor__preview-btn__active` : ''
              }`}
              onClick={(): void => changePreview(!showPreview)}
            >
              <OpenPreviewIcon />
            </button>
          ) : null}
        </div>
      </div>
      <div className="panel__content">
        {isPreviewSupported ? (
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={300}>
              <div className="text-element-editor__editor">
                <CodeEditor
                  language={getTextElementEditorLanguage(textElement.type)}
                  inputValue={textElement.content}
                  updateInput={changeContent}
                  hidePadding={true}
                />
              </div>
            </ResizablePanel>
            {showPreview && <ResizablePanelSplitter />}
            {showPreview && (
              <ResizablePanel minSize={300}>
                <div className="text-element-editor__preview">
                  <MarkdownTextViewer
                    value={{ value: textElement.content }}
                    className="text-element-editor__preview__markdown"
                  />
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        ) : (
          <div className="text-element-editor__editor">
            <CodeEditor
              language={getTextElementEditorLanguage(textElement.type)}
              inputValue={textElement.content}
              updateInput={changeContent}
              hidePadding={true}
            />
          </div>
        )}
      </div>
    </div>
  );
});
