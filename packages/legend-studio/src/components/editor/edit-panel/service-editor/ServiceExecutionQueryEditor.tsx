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

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type {
  ServicePureExecutionQueryState,
  ServicePureExecutionState,
} from '../../../../stores/editor-state/element-editor-state/service/ServiceExecutionState';
import { Dialog } from '@material-ui/core';
import type { SelectComponent } from '@finos/legend-art';
import {
  BlankPanelContent,
  ArrowCircleDownIcon,
  clsx,
  CustomSelectorInput,
  PanelLoadingIndicator,
  PlayIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  ScrollIcon,
} from '@finos/legend-art';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor';
import { debounce, isNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { ExecutionPlanViewer } from '../mapping-editor/execution-plan-viewer/ExecutionPlanViewer';
import { useEditorStore } from '../../EditorStoreProvider';
import {
  EDITOR_LANGUAGE,
  useApplicationStore,
} from '@finos/legend-application';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor';
import type { LightQuery } from '@finos/legend-graph';

const ServiceExecutionResultViewer = observer(
  (props: { executionState: ServicePureExecutionState }) => {
    const { executionState } = props;
    // execution
    const executionResultText = executionState.executionResultText;
    const closeExecutionResultViewer = (): void =>
      executionState.setExecutionResultText(undefined);

    return (
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
    );
  },
);

type QueryOption = { label: string; value: LightQuery };
const buildQueryOption = (query: LightQuery): QueryOption => ({
  label: query.name,
  value: query,
});

const ServiceExecutionQueryImporter = observer(
  (props: { queryState: ServicePureExecutionQueryState }) => {
    const { queryState } = props;
    const applicationStore = useApplicationStore();
    const queryFinderRef = useRef<SelectComponent>(null);
    const closeQueryImporter = (): void =>
      queryState.setOpenQueryImporter(false);
    const handleEnterQueryImporter = (): void =>
      queryFinderRef.current?.focus();

    // query finder
    const [searchText, setSearchText] = useState('');
    const queryOptions = queryState.queries.map(buildQueryOption);
    const selectedQueryOption = queryState.selectedQueryInfo
      ? {
          label: queryState.selectedQueryInfo.query.name,
          value: queryState.selectedQueryInfo.query,
        }
      : null;
    const onQueryOptionChange = (option: QueryOption | null): void => {
      if (option?.value !== queryState.selectedQueryInfo?.query.id) {
        flowResult(queryState.setSelectedQueryInfo(option?.value)).catch(
          applicationStore.alertIllegalUnhandledError,
        );
      }
    };
    const formatQueryOptionLabel = (option: QueryOption): React.ReactNode => (
      <div className="service-query-importer__query-option">
        <div className="service-query-importer__query-option__label">
          {option.label}
        </div>
        {Boolean(option.value.owner) && (
          <div
            className={clsx('service-query-importer__query-option__user', {
              'service-query-importer__query-option__user--mine':
                option.value.isCurrentUserQuery,
            })}
          >
            {option.value.isCurrentUserQuery ? 'mine' : option.value.owner}
          </div>
        )}
      </div>
    );

    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(queryState.loadQueries(input)).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }, 500),
      [applicationStore, queryState],
    );
    const onSearchTextChange = (value: string): void => {
      if (value !== searchText) {
        setSearchText(value);
        debouncedLoadQueries.cancel();
        debouncedLoadQueries(value);
      }
    };
    const importQuery = (): void => {
      flowResult(queryState.importQuery()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    };

    useEffect(() => {
      flowResult(queryState.loadQueries('')).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }, [queryState, applicationStore]);

    return (
      <Dialog
        open={queryState.openQueryImporter}
        onClose={closeQueryImporter}
        TransitionProps={{
          onEnter: handleEnterQueryImporter,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <div className="modal modal--dark search-modal">
          <div className="modal__title">Import Query</div>
          <CustomSelectorInput
            ref={queryFinderRef}
            options={queryOptions}
            isLoading={queryState.loadQueriesState.isInProgress}
            onInputChange={onSearchTextChange}
            inputValue={searchText}
            onChange={onQueryOptionChange}
            value={selectedQueryOption}
            placeholder="Search for a query by name..."
            darkMode={true}
            isClearable={true}
            formatOptionLabel={formatQueryOptionLabel}
          />
          <div className="service-query-importer__query-preview">
            <PanelLoadingIndicator
              isLoading={queryState.loadQueryInfoState.isInProgress}
            />
            {queryState.selectedQueryInfo && (
              <StudioTextInputEditor
                inputValue={queryState.selectedQueryInfo.content}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.PURE}
                showMiniMap={false}
                hideGutter={true}
              />
            )}
            {!queryState.selectedQueryInfo && (
              <BlankPanelContent>No query to preview</BlankPanelContent>
            )}
          </div>
          <button
            className="btn btn--dark u-pull-right"
            disabled={!queryState.selectedQueryInfo}
            onClick={importQuery}
          >
            Import
          </button>
        </div>
      </Dialog>
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
      .getStudioPlugins()
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
    const importQuery = (): void => {
      queryState.setOpenQueryImporter(true);
    };
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
              onClick={importQuery}
              disabled={isReadOnly}
              tabIndex={-1}
              title="Import query"
            >
              <ArrowCircleDownIcon />
            </button>
            <button
              className="panel__header__action"
              onClick={execute}
              disabled={isReadOnly}
              tabIndex={-1}
              title="Run service execution"
            >
              <PlayIcon />
            </button>
            <button
              className="panel__header__action"
              onClick={generatePlan}
              disabled={isReadOnly}
              tabIndex={-1}
              title="Generate execution plan"
            >
              <ScrollIcon />
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
          <ExecutionPlanViewer
            executionPlanState={executionState.executionPlanState}
          />
          <ServiceExecutionResultViewer executionState={executionState} />
          <ServiceExecutionQueryImporter queryState={queryState} />
        </div>
      </div>
    );
  },
);
