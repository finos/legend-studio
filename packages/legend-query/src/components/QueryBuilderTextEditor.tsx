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
import { clsx, Dialog } from '@finos/legend-art';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QueryTextEditorMode } from '../stores/QueryTextEditorState';
import { flowResult } from 'mobx';
import { QueryBuilderLambdaEditor } from './QueryBuilderLambdaEditor';
import {
  EDITOR_LANGUAGE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';

export const QueryBuilderTextEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const queryTextEditorState = queryBuilderState.queryTextEditorState;
    const close = (): Promise<void> =>
      flowResult(queryBuilderState.queryTextEditorState.closeModal()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    const discardChanges = (): void =>
      queryBuilderState.queryTextEditorState.setMode(undefined);
    const mode = queryTextEditorState.mode;
    useEffect(() => {
      flowResult(
        queryTextEditorState.convertLambdaObjectToGrammarString(true),
      ).catch(applicationStore.alertIllegalUnhandledError);
    }, [applicationStore, queryTextEditorState]);

    return (
      <Dialog
        open={Boolean(mode)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
        TransitionProps={{
          appear: false, // disable transition
        }}
      >
        <div
          className={clsx(
            'modal modal--dark editor-modal query-builder-text-mode__modal',
            {
              'query-builder-text-mode__modal--has-error': Boolean(
                queryTextEditorState.parserError,
              ),
            },
          )}
        >
          <div className="modal__header">
            <div className="modal__title">Query</div>
            {queryTextEditorState.parserError && (
              <div className="modal__title__error-badge">
                Failed to parse query
              </div>
            )}
          </div>
          <div className="modal__body">
            <div
              className={clsx('query-builder-text-mode__modal__content', {
                backdrop__element: Boolean(queryTextEditorState.parserError),
              })}
            >
              {mode === QueryTextEditorMode.TEXT && (
                <QueryBuilderLambdaEditor
                  className={'query-builder-text-mode__lambda-editor'}
                  disabled={queryTextEditorState.isConvertingLambdaToString}
                  queryBuilderState={queryBuilderState}
                  lambdaEditorState={queryTextEditorState}
                  forceBackdrop={false}
                  forceExpansion={true}
                  useBaseTextEditorSettings={true}
                  hideErrorBar={true}
                  disablePopUp={true}
                />
              )}
              {mode === QueryTextEditorMode.JSON && (
                <TextInputEditor
                  language={EDITOR_LANGUAGE.JSON}
                  inputValue={queryTextEditorState.readOnlylambdaJson}
                  isReadOnly={true}
                />
              )}
            </div>
          </div>
          <div className="modal__footer">
            {mode === QueryTextEditorMode.TEXT && (
              <button
                className="btn btn--dark btn--caution"
                onClick={discardChanges}
              >
                Discard changes
              </button>
            )}
            <button
              className="btn btn--dark"
              onClick={close}
              disabled={Boolean(queryTextEditorState.parserError)}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
