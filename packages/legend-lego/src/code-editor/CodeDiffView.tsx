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
import { editor as monacoEditorAPI } from 'monaco-editor';
import {
  DEFAULT_TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import {
  isString,
  stringifyLosslessJSON,
  tryToFormatJSONString,
  tryToFormatLosslessJSONString,
} from '@finos/legend-shared';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  getBaseCodeEditorOptions,
} from '@finos/legend-code-editor';

export const disposeDiffCodeEditor = (
  editor: monacoEditorAPI.IStandaloneDiffEditor,
): void => {
  editor.dispose();
  editor.getOriginalEditor().getModel()?.dispose();
  editor.getModifiedEditor().getModel()?.dispose();
};

export const CodeDiffView = observer(
  (props: {
    language: CODE_EDITOR_LANGUAGE;
    from?: string | undefined;
    to?: string | undefined;
  }) => {
    const { from, to, language } = props;
    const applicationStore = useApplicationStore();
    const [editor, setEditor] =
      useState<monacoEditorAPI.IStandaloneDiffEditor>();
    const editorRef = useRef<HTMLDivElement>(null);
    const originalText = from ?? '';
    const modifiedText = to ?? '';

    useEffect(() => {
      if (!editor && editorRef.current) {
        const element = editorRef.current;
        const _editor = monacoEditorAPI.createDiffEditor(element, {
          ...getBaseCodeEditorOptions(),
          theme: applicationStore.layoutService
            .TEMPORARY__isLightColorThemeEnabled
            ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
            : CODE_EDITOR_THEME.DEFAULT_DARK,
          readOnly: true,
        });
        setEditor(_editor);
      }
    }, [applicationStore, editor]);

    if (editor) {
      const originalModel = monacoEditorAPI.createModel(originalText, language);
      const modifiedModel = monacoEditorAPI.createModel(modifiedText, language);
      editor.setModel({
        original: originalModel,
        modified: modifiedModel,
      });
    }

    // dispose editor
    useEffect(
      () => (): void => {
        if (editor) {
          disposeDiffCodeEditor(editor);
        }
      },
      [editor],
    );

    return (
      <div className="code-editor__container">
        <div className="code-editor__body" ref={editorRef} />
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
        ? stringifyLosslessJSON(value, undefined, DEFAULT_TAB_SIZE)
        : JSON.stringify(value, undefined, DEFAULT_TAB_SIZE)
    : '';

export const JSONDiffView = observer(
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
      <CodeDiffView
        language={CODE_EDITOR_LANGUAGE.JSON}
        from={formatJSONLikeValue(from, Boolean(lossless))}
        to={formatJSONLikeValue(to, Boolean(lossless))}
      />
    );
  },
);
