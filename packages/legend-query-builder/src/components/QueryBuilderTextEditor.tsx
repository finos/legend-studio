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
import {
  clsx,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalFooterStatus,
  ModalHeader,
  PanelLoadingIndicator,
  RefreshIcon,
} from '@finos/legend-art';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QueryBuilderTextEditorMode } from '../stores/QueryBuilderTextEditorState.js';
import { flowResult } from 'mobx';
import {
  EDITOR_LANGUAGE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';
import { LambdaEditor } from './shared/LambdaEditor.js';

export const QueryBuilderTextEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const queryTextEditorState = queryBuilderState.textEditorState;
    const close = applicationStore.guardUnhandledError(() =>
      flowResult(queryBuilderState.textEditorState.closeModal()),
    );
    const discardChanges = (): void => {
      queryBuilderState.textEditorState.setMode(undefined);
      // force close the backdrop just in case changes are discarded when there are grammar issues
      applicationStore.setShowBackdrop(false);
    };
    const mode = queryTextEditorState.mode;
    useEffect(() => {
      flowResult(
        queryTextEditorState.convertLambdaObjectToGrammarString(true),
      ).catch(applicationStore.alertUnhandledError);
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
      >
        <Modal
          darkMode={true}
          className={clsx('editor-modal query-builder-text-mode__modal', {
            'query-builder-text-mode__modal--has-error': Boolean(
              queryTextEditorState.parserError,
            ),
          })}
        >
          <ModalHeader>
            <div className="modal__title">Query</div>
            {queryTextEditorState.parserError && (
              <div className="modal__title__error-badge">
                Failed to parse query
              </div>
            )}
          </ModalHeader>
          <PanelLoadingIndicator
            isLoading={
              queryBuilderState.textEditorState.closingQueryState.isInProgress
            }
          />
          <ModalBody>
            <div
              className={clsx('query-builder-text-mode__modal__content', {
                backdrop__element: Boolean(queryTextEditorState.parserError),
              })}
            >
              {mode === QueryBuilderTextEditorMode.TEXT && (
                <LambdaEditor
                  className="query-builder-text-mode__lambda-editor"
                  disabled={queryTextEditorState.isConvertingLambdaToString}
                  lambdaEditorState={queryTextEditorState}
                  forceBackdrop={false}
                  forceExpansion={true}
                  useBaseTextEditorSettings={true}
                  hideErrorBar={true}
                  disablePopUp={true}
                />
              )}
              {mode === QueryBuilderTextEditorMode.JSON && (
                <TextInputEditor
                  language={EDITOR_LANGUAGE.JSON}
                  inputValue={queryTextEditorState.readOnlylambdaJson}
                  isReadOnly={true}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            {queryBuilderState.textEditorState.closingQueryState
              .isInProgress && (
              <ModalFooterStatus>Closing Query...</ModalFooterStatus>
            )}
            {queryBuilderState.queryCompileState.isInProgress && (
              <ModalFooterStatus>
                <div className="loading-icon__container--spinning">
                  <RefreshIcon />
                </div>
                Compiling Query...
              </ModalFooterStatus>
            )}
            {mode === QueryBuilderTextEditorMode.TEXT && (
              <ModalFooterButton
                className="btn--caution"
                onClick={discardChanges}
                text="Discard Changes"
              />
            )}
            <button
              className="btn btn--dark"
              onClick={close}
              disabled={
                Boolean(queryTextEditorState.parserError) ||
                queryBuilderState.textEditorState.closingQueryState.isInProgress
              }
            >
              {queryBuilderState.textEditorState.closingQueryState
                .isInProgress ? (
                <>
                  <div className="loading-icon__container--spinning">
                    <RefreshIcon />
                    Closing
                  </div>
                </>
              ) : (
                <> Close </>
              )}
            </button>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
