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

import {
  createPassThroughOnKeyHandler,
  EDITOR_LANGUAGE,
  EDITOR_THEME,
  TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import {
  getBaseTextEditorOptions,
  clsx,
  Dialog,
  disposeDiffEditor,
  useResizeDetector,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { editor as monacoEditorAPI } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import {
  type QueryBuilderDiffViewState,
  QueryBuilderDiffViewMode,
} from '../stores/QueryBuilderChangeDetectionState.js';
import { pruneSourceInformation } from '@finos/legend-graph';

const TextDiffView = observer(
  (props: {
    language: EDITOR_LANGUAGE;
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
          ...getBaseTextEditorOptions(),
          theme: applicationStore.TEMPORARY__isLightThemeEnabled
            ? EDITOR_THEME.TEMPORARY__VSCODE_LIGHT
            : EDITOR_THEME.LEGEND,
          readOnly: true,
          wordWrap: 'on',
        });
        _editor.getOriginalEditor().onKeyDown(createPassThroughOnKeyHandler());
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

export const QueryBuilderDiffViewPanel = observer(
  (props: { diffViewState: QueryBuilderDiffViewState }) => {
    const { diffViewState } = props;
    const fromGrammarText = diffViewState.initialQueryGrammarText;
    const toGrammarText = diffViewState.currentQueryGrammarText;

    // actions
    const onChangeMode =
      (mode: QueryBuilderDiffViewMode): (() => void) =>
      (): void => {
        diffViewState.setMode(mode);
      };
    const close = (): void =>
      diffViewState.changeDetectionState.hideDiffViewPanel();

    useEffect(() => {
      diffViewState.generateGrammarDiff();
    }, [diffViewState]);

    return (
      <Dialog
        open={Boolean(diffViewState)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div
          className={clsx(
            'modal modal--dark editor-modal query-builder-text-mode__modal',
          )}
        >
          <div className="query-builder__diff-panel">
            <div className="query-builder__diff-panel__header">
              {Object.values(QueryBuilderDiffViewMode).map((mode) => (
                <button
                  onClick={onChangeMode(mode)}
                  className={clsx('query-builder__diff-panel__mode', {
                    'query-builder__diff-panel__mode--selected':
                      mode === diffViewState.mode,
                  })}
                  key={mode}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="query-builder__diff-panel__content">
              {diffViewState.mode === QueryBuilderDiffViewMode.GRAMMAR && (
                <TextDiffView
                  language={EDITOR_LANGUAGE.PURE}
                  from={fromGrammarText}
                  to={toGrammarText}
                />
              )}
              {diffViewState.mode === QueryBuilderDiffViewMode.JSON && (
                <TextDiffView
                  language={EDITOR_LANGUAGE.JSON}
                  from={JSON.stringify(
                    {
                      parameters: diffViewState.initialQuery.parameters
                        ? pruneSourceInformation(
                            diffViewState.initialQuery.parameters as Record<
                              PropertyKey,
                              unknown
                            >,
                          )
                        : undefined,
                      body: diffViewState.initialQuery.body
                        ? pruneSourceInformation(
                            diffViewState.initialQuery.body as Record<
                              PropertyKey,
                              unknown
                            >,
                          )
                        : undefined,
                    },
                    null,
                    TAB_SIZE,
                  )}
                  to={JSON.stringify(
                    {
                      parameters: diffViewState.currentQuery.parameters
                        ? pruneSourceInformation(
                            diffViewState.currentQuery.parameters as Record<
                              PropertyKey,
                              unknown
                            >,
                          )
                        : undefined,
                      body: diffViewState.currentQuery.body
                        ? pruneSourceInformation(
                            diffViewState.currentQuery.body as Record<
                              PropertyKey,
                              unknown
                            >,
                          )
                        : undefined,
                    },
                    null,
                    TAB_SIZE,
                  )}
                />
              )}
            </div>
            <div className="query-builder__diff-panel__actions">
              <button className="btn btn--dark" onClick={close}>
                Close
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    );
  },
);
