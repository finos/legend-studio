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
  DataCubeExistingColumnEditorState,
  type DataCubeColumnBaseEditorState,
} from '../../../stores/view/extend/DataCubeColumnEditorState.js';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IDisposable,
} from 'monaco-editor';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CODE_EDITOR_THEME,
  PURE_CODE_EDITOR_WORD_SEPARATORS,
  CODE_EDITOR_LANGUAGE,
  getBaseCodeEditorOptions,
} from '@finos/legend-code-editor';
import {
  getCodeSuggestions,
  MONACO_EDITOR_OVERFLOW_WIDGETS_ROOT_ID,
} from '../../core/DataCubePureCodeEditorUtils.js';
import {
  FormButton,
  FormDocumentation,
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
  FormTextInput,
} from '../../core/DataCubeFormUtils.js';
import { debounce } from '@finos/legend-shared';
import { cn, DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import {
  DataCubeColumnDataType,
  DataCubeColumnKind,
} from '../../../stores/core/DataCubeQueryEngine.js';
import { DataCubeDocumentationKey } from '../../../__lib__/DataCubeDocumentation.js';
import { useDataCube } from '../../DataCubeProvider.js';

enum DataCubeExtendedColumnKind {
  LEAF_LEVEL_MEASURE = 'Leaf Level Measure',
  LEAF_LEVEL_DIMENSION = 'Leaf Level Dimension',
  GROUP_LEVEL = 'Group Level',
}

export const DataCubeColumnCreator = observer(
  (props: { state: DataCubeColumnBaseEditorState }) => {
    const { state } = props;
    const dataCube = useDataCube();
    const view = state.view;

    const nameInputRef = useRef<HTMLInputElement>(null);
    const currentColumnKind = state.isGroupLevel
      ? DataCubeExtendedColumnKind.GROUP_LEVEL
      : state.columnKind === DataCubeColumnKind.MEASURE
        ? DataCubeExtendedColumnKind.LEAF_LEVEL_MEASURE
        : DataCubeExtendedColumnKind.LEAF_LEVEL_DIMENSION;
    const [
      openKindDropdown,
      closeKindDropdown,
      kindDropdownProps,
      kindDropPropsOpen,
    ] = useDropdownMenu();
    const [
      openTypeDropdown,
      closeTypeDropdown,
      typeDropdownProps,
      typeDropPropsOpen,
    ] = useDropdownMenu();

    const suggestionsProvider = useRef<IDisposable | undefined>(undefined);
    const editorRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();
    const debouncedCheckReturnType = useMemo(
      () =>
        debounce((): void => {
          state
            .getReturnType()
            .catch((error) => dataCube.alertService.alertUnhandledError(error));
        }, 500),
      [state, dataCube],
    );

    useEffect(() => {
      if (!editor && editorRef.current) {
        const element = editorRef.current;
        const newEditor = monacoEditorAPI.create(element, {
          ...getBaseCodeEditorOptions(),
          fontSize: 12,
          language: CODE_EDITOR_LANGUAGE.PURE,
          theme: CODE_EDITOR_THEME.GITHUB_LIGHT,
          wordSeparators: PURE_CODE_EDITOR_WORD_SEPARATORS,
          // Make sure the widgets (tooltips, menus) are not clipped by the container bounds
          // and fix the problem where widgets are rendered with position=fixed not working well with parent
          // containers (i.e. the draggable window) which has been transformed
          // See https://dev.to/salilnaik/the-uncanny-relationship-between-position-fixed-and-transform-property-32f6
          // See https://github.com/microsoft/monaco-editor/issues/2793#issuecomment-999337740
          fixedOverflowWidgets: true,
          overflowWidgetsDomNode: document.getElementById(
            MONACO_EDITOR_OVERFLOW_WIDGETS_ROOT_ID,
          )!,
        });

        // NOTE: since engine suggestions are computed based on the current text content
        // we put it in this block to simplify the flow and really to "bend" monaco-editor
        // suggestion provider to our needs. But we also need to make sure this suggestion
        // provider is scoped to the current editor only by checking the editor model
        suggestionsProvider.current?.dispose();
        suggestionsProvider.current =
          monacoLanguagesAPI.registerCompletionItemProvider(
            CODE_EDITOR_LANGUAGE.PURE,
            {
              // NOTE: this is a hack to fetch suggestions from engine for every keystroke
              triggerCharacters: [...PURE_CODE_EDITOR_WORD_SEPARATORS, '$'],
              provideCompletionItems: async (model, position, context) => {
                let suggestions: monacoLanguagesAPI.CompletionItem[] = [];

                if (model.uri === state.editorModelUri) {
                  suggestions = suggestions.concat(
                    await getCodeSuggestions(
                      position,
                      model,
                      state.codePrefix,
                      view,
                      () => state.buildExtendBaseQuery(),
                    ),
                  );
                }

                return { suggestions };
              },
            },
          );

        newEditor.setModel(state.editorModel);
        newEditor.onDidChangeModelContent(() => {
          const currentVal = newEditor.getValue();
          if (currentVal !== state.code) {
            state.code = currentVal;
            // clear error on content change/typing
            state.clearError();
            state.setReturnType(undefined);
            debouncedCheckReturnType.cancel();
            debouncedCheckReturnType();
          }
        });
        // focus on the editor initially and set the cursor to the end
        // since we're trying to create a new column
        newEditor.focus();
        newEditor.setPosition({
          lineNumber: 1,
          column: state.code.length + 1,
        });
        state.setEditor(newEditor);
        setEditor(newEditor);
      }
    }, [state, editor, debouncedCheckReturnType, view]);

    // clean up
    useEffect(
      () => (): void => {
        if (editor) {
          editor.dispose();

          suggestionsProvider.current?.dispose();
        }
      },
      [editor],
    );

    useEffect(() => {
      state.editor?.updateOptions({
        readOnly: state.finalizationState.isInProgress,
      });
    }, [state, state.finalizationState.isInProgress]);

    return (
      <>
        <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
          <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
            <div className="h-full w-full select-none p-0">
              <div className="h-24 w-full p-2">
                <div className="mt-1 flex h-5 w-full items-center">
                  <div className="flex h-full w-24 flex-shrink-0 items-center text-sm">
                    Column Name:
                  </div>
                  <FormTextInput
                    className="w-32"
                    ref={nameInputRef}
                    disabled={state.finalizationState.isInProgress}
                    value={state.name}
                    onChange={(event) => {
                      state.setName(event.target.value);
                    }}
                  />
                  <div className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-lg">
                    {state.isNameValid ? (
                      <DataCubeIcon.CircleChecked className="text-green-500" />
                    ) : (
                      <DataCubeIcon.CircledFailed className="text-red-500" />
                    )}
                  </div>
                </div>
                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-24 flex-shrink-0 items-center text-sm">
                    Column Kind:
                    <FormDocumentation
                      className="ml-1"
                      documentationKey={
                        DataCubeDocumentationKey.EXTENDED_COLUMN_LEVELS
                      }
                    />
                  </div>
                  <FormDropdownMenuTrigger
                    className="w-32"
                    onClick={openKindDropdown}
                    open={kindDropPropsOpen}
                    disabled={state.finalizationState.isInProgress}
                  >
                    {currentColumnKind}
                  </FormDropdownMenuTrigger>
                  <FormDropdownMenu className="w-32" {...kindDropdownProps}>
                    {[
                      DataCubeExtendedColumnKind.LEAF_LEVEL_MEASURE,
                      DataCubeExtendedColumnKind.LEAF_LEVEL_DIMENSION,
                      DataCubeExtendedColumnKind.GROUP_LEVEL,
                    ].map((columnKind) => (
                      <FormDropdownMenuItem
                        key={columnKind}
                        onClick={() => {
                          switch (columnKind) {
                            case DataCubeExtendedColumnKind.LEAF_LEVEL_MEASURE: {
                              state.setColumnKind(
                                false,
                                DataCubeColumnKind.MEASURE,
                              );
                              break;
                            }
                            case DataCubeExtendedColumnKind.LEAF_LEVEL_DIMENSION: {
                              state.setColumnKind(
                                false,
                                DataCubeColumnKind.DIMENSION,
                              );
                              break;
                            }
                            case DataCubeExtendedColumnKind.GROUP_LEVEL: {
                              state.setColumnKind(true, undefined);
                              break;
                            }
                            default:
                              return;
                          }
                          state.clearError();
                          state.setReturnType(undefined);
                          debouncedCheckReturnType.cancel();
                          debouncedCheckReturnType();
                          closeKindDropdown();
                        }}
                        autoFocus={columnKind === currentColumnKind}
                      >
                        {columnKind}
                      </FormDropdownMenuItem>
                    ))}
                  </FormDropdownMenu>
                </div>
                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-24 flex-shrink-0 items-center text-sm">
                    Value Type:
                  </div>
                  <FormDropdownMenuTrigger
                    className="w-32"
                    onClick={openTypeDropdown}
                    open={typeDropPropsOpen}
                    disabled={state.finalizationState.isInProgress}
                  >
                    {state.expectedType}
                  </FormDropdownMenuTrigger>
                  <div className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-lg">
                    {state.validationState.isInProgress ? (
                      <DataCubeIcon.Loader className="animate-spin stroke-2 text-neutral-400" />
                    ) : state.returnType ? (
                      state.isTypeValid ? (
                        <DataCubeIcon.CircleChecked className="text-green-500" />
                      ) : (
                        <DataCubeIcon.CircledFailed className="text-red-500" />
                      )
                    ) : null}
                  </div>
                  <FormDropdownMenu className="w-32" {...typeDropdownProps}>
                    {[
                      DataCubeColumnDataType.TEXT,
                      DataCubeColumnDataType.NUMBER,
                      DataCubeColumnDataType.DATE,
                    ].map((dataType) => (
                      <FormDropdownMenuItem
                        key={dataType}
                        onClick={() => {
                          state.setExpectedType(dataType);
                          closeTypeDropdown();
                        }}
                        autoFocus={dataType === state.expectedType}
                      >
                        {dataType}
                      </FormDropdownMenuItem>
                    ))}
                  </FormDropdownMenu>
                </div>
              </div>
              <div className="h-[calc(100%_-_96px)] w-full p-2 pt-1">
                <div
                  className={cn(
                    'relative h-full w-full border border-neutral-200',
                    {
                      'border-red-500': Boolean(state.codeError),
                    },
                  )}
                >
                  <div
                    className="absolute left-0 top-0 h-full w-full overflow-hidden"
                    ref={editorRef}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-10 items-center justify-end px-2">
          <FormButton onClick={() => state.close()}>Cancel</FormButton>
          {state instanceof DataCubeExistingColumnEditorState && (
            <>
              <FormButton
                className="ml-2"
                onClick={() => {
                  state.manager
                    .deleteColumn(state.initialData.name)
                    .catch((error) =>
                      dataCube.alertService.alertUnhandledError(error),
                    );
                }}
              >
                Delete
              </FormButton>
              <FormButton
                className="ml-2"
                onClick={() => {
                  state
                    .reset()
                    .catch((error) =>
                      dataCube.alertService.alertUnhandledError(error),
                    );
                }}
              >
                Reset
              </FormButton>
            </>
          )}
          <FormButton
            className="ml-2"
            disabled={
              !state.isNameValid ||
              !state.isTypeValid ||
              state.validationState.isInProgress ||
              state.finalizationState.isInProgress
            }
            onClick={() => {
              state
                .applyChanges()
                .catch((error) =>
                  dataCube.alertService.alertUnhandledError(error),
                );
            }}
          >
            OK
          </FormButton>
        </div>
      </>
    );
  },
);
