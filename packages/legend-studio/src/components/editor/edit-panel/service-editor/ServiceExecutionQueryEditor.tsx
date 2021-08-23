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
import { observer } from 'mobx-react-lite';
import { FaPlay, FaScroll } from 'react-icons/fa';
import type { ServicePureExecutionState } from '../../../../stores/editor-state/element-editor-state/service/ServiceExecutionState';
import { Dialog } from '@material-ui/core';
import {
  clsx,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor';
import { isNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { ExecutionPlanViewer } from '../mapping-editor/execution-plan-viewer/ExecutionPlanViewer';
import { useEditorStore } from '../../EditorStoreProvider';
import { EDITOR_LANGUAGE } from '@finos/legend-application';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor';

const ServiceExecutionModals = observer(
  (props: { executionState: ServicePureExecutionState }) => {
    const { executionState } = props;
    // execution
    const executionResultText = executionState.executionResultText;
    const closeExecutionResultViewer = (): void =>
      executionState.setExecutionResultText(undefined);
    return (
      <>
        <ExecutionPlanViewer
          executionPlanState={executionState.executionPlanState}
        />
        <Dialog
          open={Boolean(executionResultText)}
          onClose={closeExecutionResultViewer}
          classes={{
            root: 'editor-modal__root-container',
            container: 'editor-modal__container',
            paper: 'editor-modal__content',
          }}
        >
          <div className="modal modal--dark editor-modal">
            <div className="modal__header">
              <div className="modal__title">Execution Result</div>
            </div>
            <div className="modal__body">
              <StudioTextInputEditor
                inputValue={executionResultText ?? ''}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.JSON}
                showMiniMap={true}
              />
            </div>
            <div className="modal__footer">
              <button
                className="btn modal__footer__close-btn"
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
    const extraServiceQueryEditors = editorStore.pluginManager
      .getEditorPlugins()
      .flatMap(
        (plugin) =>
          plugin.TEMP__getExtraServiceQueryEditorRendererConfigurations?.() ??
          [],
      )
      .filter(isNonNullable)
      .map((config) => (
        <Fragment key={config.key}>
          {config.renderer(executionState, isReadOnly)}
        </Fragment>
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
      flowResult(executionState.execute()),
    );
    const generatePlan = applicationStore.guaranteeSafeAction(() =>
      flowResult(executionState.generatePlan()),
    );
    // convert to string
    useEffect(() => {
      flowResult(queryState.convertLambdaObjectToGrammarString(true)).catch(
        applicationStore.alertIllegalUnhandledError,
      );
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
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel minSize={300}>
                <div
                  className={clsx('service-execution-query-editor__content')}
                >
                  <StudioTextInputEditor
                    inputValue={queryState.lambdaString}
                    isReadOnly={true}
                    language={EDITOR_LANGUAGE.PURE}
                    showMiniMap={true}
                  />
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel size={300} minSize={200}>
                <div className="service-execution-query-editor__editor-trigger">
                  {extraServiceQueryEditors}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
          <ServiceExecutionModals executionState={executionState} />
        </div>
      </div>
    );
  },
);
