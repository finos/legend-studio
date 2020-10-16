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

import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { editor as monacoEditorAPI, KeyCode } from 'monaco-editor';
import ReactResizeDetector from 'react-resize-detector';
import { EDITOR_THEME, EDITOR_LANGUAGE, TAB_SIZE } from 'Stores/EditorConfig';
import { disposeDiffEditor, disableEditorHotKeys, baseTextEditorSettings } from 'Utilities/TextEditorUtil';
import { useEditorStore } from 'Stores/EditorStore';
import { isString } from 'Utilities/GeneralUtil';
import { tryToFormatJSONString } from 'Utilities/FormatterUtil';
import { useApplicationStore } from 'Stores/ApplicationStore';

export const JsonDiffView = observer((props: {
  from?: unknown;
  to?: unknown;
}) => {
  const { from, to } = props;
  const originalJSON = from ? isString(from) ? tryToFormatJSONString(from) : JSON.stringify(from, null, TAB_SIZE) : '';
  const modifiedJSON = to ? isString(to) ? tryToFormatJSONString(to) : JSON.stringify(to, null, TAB_SIZE) : '';

  return <TextDiffView language={EDITOR_LANGUAGE.JSON} from={originalJSON} to={modifiedJSON} />;
});

export const TextDiffView = observer((props: {
  language: EDITOR_LANGUAGE;
  from?: string;
  to?: string;
}) => {
  const { from, to, language } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const [editor, setEditor] = useState<monacoEditorAPI.IStandaloneDiffEditor>();
  const editorRef = useRef<HTMLDivElement>(null);
  const originalText = from ?? '';
  const modifiedText = to ?? '';
  const handleResize = (width: number, height: number): void => editor?.layout({ height, width });

  useEffect(() => {
    if (!editor && editorRef.current) {
      const element = editorRef.current;
      const _editor = monacoEditorAPI.createDiffEditor(element, {
        ...baseTextEditorSettings,
        theme: EDITOR_THEME.STUDIO,
        readOnly: true,
      });
      _editor.getOriginalEditor().onKeyDown(event => {
        if (event.keyCode === KeyCode.F8) { event.preventDefault(); event.stopPropagation(); editorStore.toggleTextMode().catch(applicationStore.alertIllegalUnhandledError) }
      });
      _editor.getModifiedEditor().onKeyDown(event => {
        if (event.keyCode === KeyCode.F8) { event.preventDefault(); event.stopPropagation(); editorStore.toggleTextMode().catch(applicationStore.alertIllegalUnhandledError) }
      });
      disableEditorHotKeys(_editor);
      setEditor(_editor);
    }
  }, [applicationStore, editorStore, editor]);

  if (editor) {
    const originalModel = monacoEditorAPI.createModel(originalText, language);
    const modifiedModel = monacoEditorAPI.createModel(modifiedText, language);
    editor.setModel({
      original: originalModel,
      modified: modifiedModel
    });
  }

  useEffect(() => (): void => { if (editor) { disposeDiffEditor(editor) } }, [editor]); // dispose editor

  return (
    <ReactResizeDetector
      handleWidth={true}
      handleHeight={true}
      onResize={handleResize}
    >
      <div className="text-editor__container">
        <div className="text-editor__body" ref={editorRef} />
      </div>
    </ReactResizeDetector>
  );
});
