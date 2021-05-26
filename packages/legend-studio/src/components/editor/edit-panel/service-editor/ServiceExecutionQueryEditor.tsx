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

import { Fragment, useEffect } from 'react';
import { useEditorStore } from '../../../../stores/EditorStore';
import { observer } from 'mobx-react-lite';
import { FaPlay, FaScroll } from 'react-icons/fa';
import type { ServicePureExecutionState } from '../../../../stores/editor-state/element-editor-state/service/ServiceExecutionState';
import { EDITOR_LANGUAGE, TAB_SIZE } from '../../../../stores/EditorConfig';
import { TextInputEditor } from '../../../shared/TextInputEditor';
import { Dialog } from '@material-ui/core';
import { clsx, PanelLoadingIndicator } from '@finos/legend-studio-components';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor';
import SplitPane from 'react-split-pane';
import { isNonNullable } from '@finos/legend-studio-shared';

const ServiceExecutionModals = observer(
  (props: { executionState: ServicePureExecutionState }) => {
    const { executionState } = props;
    // execution
    const executionResultText = executionState.executionResultText;
    const closeExecutionResultViewer = (): void =>
      executionState.setExecutionResultText(undefined);
    // plan
    const executionPlan = executionState.executionPlan;
    const closePlanViewer = (): void =>
      executionState.setExecutionPlan(undefined);
    const planText = executionState.executionPlan
      ? JSON.stringify(executionState.executionPlan, undefined, TAB_SIZE)
      : '';
    return (
      <>
        <Dialog
          open={Boolean(executionPlan)}
          onClose={closePlanViewer}
          classes={{
            root: 'editor-modal__root-container',
            container: 'editor-modal__container',
            paper: 'editor-modal__content',
          }}
        >
          <div className="modal modal--dark editor-modal execution-plan-viewer">
            <div className="modal__header">
              <div className="modal__title">Execution Plan</div>
            </div>
            <div className="modal__body">
              <TextInputEditor
                inputValue={planText}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.JSON}
                showMiniMap={true}
              />
            </div>
            <div className="modal__footer">
              <button
                className="btn execution-plan-viewer__close-btn"
                onClick={closePlanViewer}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
        <Dialog
          open={Boolean(executionResultText)}
          onClose={closeExecutionResultViewer}
          classes={{
            root: 'editor-modal__root-container',
            container: 'editor-modal__container',
            paper: 'editor-modal__content',
          }}
        >
          <div className="modal modal--dark editor-modal execution-plan-viewer">
            <div className="modal__header">
              <div className="modal__title">Execution Result</div>
            </div>
            <div className="modal__body">
              <TextInputEditor
                inputValue={executionResultText ?? ''}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.JSON}
                showMiniMap={true}
              />
            </div>
            <div className="modal__footer">
              <button
                className="btn execution-plan-viewer__close-btn"
                onClick={closeExecutionResultViewer}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      </>
    );
  },
);

export const ServiceExecutionQueryEditor = observer(
  (props: {
    executionState: ServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const { executionState, isReadOnly } = props;
    const queryState = executionState.queryState;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    // query editor extensions
    const extraServiceQueryEditors = applicationStore.pluginManager
      .getEditorPlugins()
      .flatMap(
        (plugin) =>
          plugin.TEMP__getExtraServiceQueryEditorRendererConfigurations?.() ??
          [],
      )
      .filter(isNonNullable)
      .map((config) => (
        <Fragment key={config.key}>{config.renderer(executionState)}</Fragment>
      ));
    if (extraServiceQueryEditors.length === 0) {
      extraServiceQueryEditors.push(
        <Fragment key={'unsupported-query-editor'}>
          <UnsupportedEditorPanel
            text={`Can't edit this query in form-mode`}
            isReadOnly={isReadOnly}
          />
        </Fragment>,
      );
    }
    // execution
    const execute = applicationStore.guaranteeSafeAction(() =>
      executionState.execute(),
    );
    const generatePlan = applicationStore.guaranteeSafeAction(() =>
      executionState.generatePlan(),
    );
    // convert to string
    useEffect(() => {
      queryState
        .convertLambdaObjectToGrammarString(true)
        .catch(applicationStore.alertIllegalUnhandledError);
    }, [applicationStore, queryState]);

    return (
      <div className="panel service-execution-query-editor">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label service-editor__execution__label--query">
              query
            </div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={execute}
              disabled={isReadOnly}
              tabIndex={-1}
              title={'Run service execution'}
            >
              <FaPlay />
            </button>
            <button
              className="panel__header__action"
              onClick={generatePlan}
              disabled={isReadOnly}
              tabIndex={-1}
              title={'Generate execution plan'}
            >
              <FaScroll />
            </button>
          </div>
        </div>
        <div className="panel__content property-mapping-editor__entry__container">
          <PanelLoadingIndicator
            isLoading={
              executionState.isOpeningQueryEditor ||
              executionState.isExecuting ||
              executionState.isGeneratingPlan
            }
          />
          {queryState.query.isStub ? (
            <div className="service-execution-query-editor__editor-trigger">
              {extraServiceQueryEditors}
            </div>
          ) : (
            <SplitPane
              split="vertical"
              defaultSize="60%"
              minSize={15}
              maxSize={2000}
            >
              <div className={clsx('service-execution-query-editor__content')}>
                <TextInputEditor
                  inputValue={queryState.lambdaString}
                  isReadOnly={true}
                  language={EDITOR_LANGUAGE.PURE}
                  showMiniMap={true}
                />
              </div>
              <div className="service-execution-query-editor__editor-trigger">
                {extraServiceQueryEditors}
              </div>
            </SplitPane>
          )}
          <ServiceExecutionModals executionState={executionState} />
        </div>
      </div>
    );
  },
);
