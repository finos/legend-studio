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

import { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { editor as monacoEditorAPI, KeyCode } from 'monaco-editor';
import { useResizeDetector } from 'react-resize-detector';
import {
  EDITOR_THEME,
  EDITOR_LANGUAGE,
  TAB_SIZE,
} from '../../stores/EditorConfig';
import {
  disposeDiffEditor,
  disableEditorHotKeys,
  baseTextEditorSettings,
} from '../../utils/TextEditorUtil';
import { useEditorStore } from '../../stores/EditorStore';
import {
  isString,
  losslessStringify,
  tryToFormatJSONString,
  tryToFormatLosslessJSONString,
} from '@finos/legend-studio-shared';
import { useApplicationStore } from '../../stores/ApplicationStore';

export const TextDiffView = observer(
  (props: { language: EDITOR_LANGUAGE; from?: string; to?: string }) => {
    const { from, to, language } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const [editor, setEditor] =
      useState<monacoEditorAPI.IStandaloneDiffEditor>();
    const editorRef = useRef<HTMLDivElement>(null);
    const originalText = from ?? '';
    const modifiedText = to ?? '';

    const { ref, width, height } = useResizeDetector<HTMLDivElement>();

    useEffect(() => {
      if (width !== undefined && height !== undefined) {
        editor?.layout({ width, height });
      }
    }, [editor, width, height]);

    useEffect(() => {
      if (!editor && editorRef.current) {
        const element = editorRef.current;
        const _editor = monacoEditorAPI.createDiffEditor(element, {
          ...baseTextEditorSettings,
          theme: EDITOR_THEME.STUDIO,
          readOnly: true,
        });
        _editor.getOriginalEditor().onKeyDown((event) => {
          if (event.keyCode === KeyCode.F8) {
            event.preventDefault();
            event.stopPropagation();
            editorStore
              .toggleTextMode()
              .catch(applicationStore.alertIllegalUnhandledError);
          }
        });
        _editor.getModifiedEditor().onKeyDown((event) => {
          if (event.keyCode === KeyCode.F8) {
            event.preventDefault();
            event.stopPropagation();
            editorStore
              .toggleTextMode()
              .catch(applicationStore.alertIllegalUnhandledError);
          }
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
        modified: modifiedModel,
      });
    }

    useEffect(
      () => (): void => {
        if (editor) {
          disposeDiffEditor(editor);
        }
      },
      [editor],
    ); // dispose editor

    return (
      <div ref={ref} className="text-editor__container">
        <div className="text-editor__body" ref={editorRef} />
      </div>
    );
  },
);

const formatJSONLikeValue = (value: unknown, lossless: boolean): string =>
  value
    ? isString(value)
      ? lossless
        ? tryToFormatLosslessJSONString(value)
        : tryToFormatJSONString(value)
      : lossless
      ? losslessStringify(value, undefined, TAB_SIZE)
      : JSON.stringify(value, undefined, TAB_SIZE)
    : '';

export const JsonDiffView = observer(
  (props: {
    from?: unknown;
    to?: unknown;
    /**
     * Use lossless algorithm while parsing/stringifying JSON-like value
     */
    lossless?: boolean;
  }) => {
    const { from, to, lossless } = props;

    return (
      <TextDiffView
        language={EDITOR_LANGUAGE.JSON}
        from={formatJSONLikeValue(from, Boolean(lossless))}
        to={formatJSONLikeValue(to, Boolean(lossless))}
      />
    );
  },
);
