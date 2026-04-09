/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import React, { useEffect, useMemo } from 'react';
import {
  BlankPanelContent,
  CaretDownIcon,
  clsx,
  ControlledDropdownMenu,
  CustomSelectorInput,
  ExclamationTriangleIcon,
  MenuContent,
  MenuContentItem,
  Panel,
  PanelContent,
  PanelFormBooleanField,
  PanelFormSection,
  PanelLoadingIndicator,
  PauseCircleIcon,
  PlayIcon,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { MD5HashStrategy } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  DataQualityRelationComparisonConfigurationState,
  RECONCILIATION_EXECUTION_TYPE,
} from './states/DataQualityRelationComparisonConfigurationState.js';
import { useEditorStore } from '@finos/legend-application-studio';
import {
  DEFAULT_TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import {
  LambdaEditor,
  getTDSColumnCustomizations,
  getFilterTDSColumnCustomizations,
} from '@finos/legend-query-builder';
import { flowResult } from 'mobx';
import { DataQualityMultiCustomSelector } from './DataQualityCustomSelector.js';
import {
  type ExecutionResult,
  TDSExecutionResult,
  RawExecutionResult,
  extractExecutionResultValues,
} from '@finos/legend-graph';
import {
  guaranteeType,
  prettyDuration,
  returnUndefOnError,
} from '@finos/legend-shared';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import {
  DataQualityResultCellRenderer,
  getRowDataFromExecutionResult,
} from './DataQualityRelationGridResult.js';
import {
  type DataGridColumnDefinition,
  DataGrid,
} from '@finos/legend-lego/data-grid';

export const DataQualityRelationComparisonEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const state = editorStore.tabManagerState.getCurrentEditorState(
    DataQualityRelationComparisonConfigurationState,
  );

  const comparison = state.element;
  const md5Strategy = guaranteeType(comparison.strategy, MD5HashStrategy);

  const sourceColumnOptions = state.sourceColumnOptions;
  const targetColumnOptions = state.targetColumnOptions;
  const combinedColumnOptions = state.combinedColumnOptions;

  const isRunning = state.isRunning;
  const executionResult = state.executionResult;
  const isFetchingColumns = state.isFetchingColumns;
  const hasColumnFetchError = state.hasColumnFetchError;
  const columnFetchError = state.columnFetchError;
  const hasNoOverlappingColumns = state.hasNoOverlappingColumns;
  const columnsDisabled = hasColumnFetchError || isFetchingColumns;

  // Execution handlers
  const cancelRun = applicationStore.guardUnhandledError(() =>
    flowResult(state.cancelRun()),
  );

  const runReconciliation = applicationStore.guardUnhandledError(() =>
    flowResult(state.run(RECONCILIATION_EXECUTION_TYPE.RECONCILIATION)),
  );

  const runSourceQuery = applicationStore.guardUnhandledError(() =>
    flowResult(state.run(RECONCILIATION_EXECUTION_TYPE.SOURCE_QUERY)),
  );

  const runTargetQuery = applicationStore.guardUnhandledError(() =>
    flowResult(state.run(RECONCILIATION_EXECUTION_TYPE.TARGET_QUERY)),
  );

  const retryFetchColumns = applicationStore.guardUnhandledError(() =>
    flowResult(state.retryFetchColumns()),
  );

  const getResultSetDescription = (
    _executionResult: ExecutionResult,
  ): string | undefined => {
    const queryDuration = state.executionDuration
      ? prettyDuration(state.executionDuration)
      : undefined;
    if (!queryDuration) {
      return undefined;
    }
    const executionName =
      state.lastExecutionType === RECONCILIATION_EXECUTION_TYPE.RECONCILIATION
        ? 'Data Comparison'
        : state.lastExecutionType === RECONCILIATION_EXECUTION_TYPE.SOURCE_QUERY
          ? 'Source Query'
          : 'Target Query';
    return `${executionName} ran in ${queryDuration}`;
  };

  const resultDescription =
    !isRunning && executionResult
      ? getResultSetDescription(executionResult)
      : undefined;

  const darkMode =
    !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

  const renderResult = (): React.ReactNode => {
    if (executionResult instanceof TDSExecutionResult) {
      const colDefs = executionResult.result.columns.map(
        (colName) =>
          ({
            minWidth: 50,
            sortable: true,
            resizable: true,
            field: colName,
            flex: 1,
            ...getTDSColumnCustomizations(executionResult, colName),
            ...getFilterTDSColumnCustomizations(executionResult, colName),
            cellRenderer: DataQualityResultCellRenderer,
          }) as DataGridColumnDefinition,
      );
      return (
        <div className="data-quality-validation__result__values__table">
          <div
            className={clsx('data-quality-validation__result__tds-grid', {
              'ag-theme-balham': !darkMode,
              'ag-theme-balham-dark': darkMode,
            })}
          >
            <DataGrid
              rowData={getRowDataFromExecutionResult(executionResult)}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (data) => `${data.data.rowNumber}`,
                rowSelection: {
                  mode: 'multiRow',
                  checkboxes: false,
                  headerCheckbox: false,
                },
              }}
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={false}
              columnDefs={colDefs}
            />
          </div>
        </div>
      );
    }
    if (executionResult instanceof RawExecutionResult) {
      const val =
        executionResult.value === null
          ? 'null'
          : executionResult.value.toString();
      return (
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.TEXT}
          inputValue={val}
          isReadOnly={true}
        />
      );
    } else if (executionResult !== undefined) {
      const json =
        returnUndefOnError(() =>
          JSON.stringify(
            extractExecutionResultValues(executionResult),
            null,
            DEFAULT_TAB_SIZE,
          ),
        ) ?? JSON.stringify(executionResult);
      return (
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.JSON}
          inputValue={json}
          isReadOnly={true}
        />
      );
    }
    return <BlankPanelContent>No Data to Display</BlankPanelContent>;
  };

  useEffect(() => {
    flowResult(
      state.sourceLambdaEditorState.convertLambdaObjectToGrammarString({
        pretty: true,
        firstLoad: true,
      }),
    ).catch(applicationStore.alertUnhandledError);
    flowResult(
      state.targetLambdaEditorState.convertLambdaObjectToGrammarString({
        pretty: true,
        firstLoad: true,
      }),
    ).catch(applicationStore.alertUnhandledError);
  }, [
    applicationStore,
    state.sourceLambdaEditorState,
    state.targetLambdaEditorState,
  ]);

  const sourceHashColumnValue = md5Strategy.sourceHashColumn
    ? {
        value: md5Strategy.sourceHashColumn,
        label: md5Strategy.sourceHashColumn,
      }
    : undefined;

  const targetHashColumnValue = md5Strategy.targetHashColumn
    ? {
        value: md5Strategy.targetHashColumn,
        label: md5Strategy.targetHashColumn,
      }
    : undefined;

  const selectedKeyOptions = useMemo(() => {
    const selectedKeys = new Set(comparison.keys);
    return combinedColumnOptions.filter(({ value }) => selectedKeys.has(value));
  }, [combinedColumnOptions, comparison.keys]);

  const selectedColumnsToCompareOptions = useMemo(() => {
    const selectedColumns = new Set(comparison.columnsToCompare);
    return combinedColumnOptions.filter(({ value }) =>
      selectedColumns.has(value),
    );
  }, [combinedColumnOptions, comparison.columnsToCompare]);

  return (
    <div className="data-quality-relation-comparison-editor">
      <Panel>
        <PanelLoadingIndicator isLoading={isRunning} />
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              dataQualityRelationComparison
            </div>
            <div className="panel__header__title__content">
              {comparison.name}
            </div>
          </div>
        </div>
        <div className="data-quality-relation-comparison-editor__actions-bar">
          <div className="btn__dropdown-combo btn__dropdown-combo--primary">
            {state.isRunning ? (
              <button
                className="btn__dropdown-combo__canceler data-quality-relation-comparison-editor__actions-bar__cancel-btn"
                onClick={cancelRun}
                tabIndex={-1}
              >
                <div className="btn--dark btn--caution btn__dropdown-combo__canceler__label data-quality-relation-comparison-editor__actions-bar__cancel-label">
                  <PauseCircleIcon className="btn__dropdown-combo__canceler__label__icon" />
                  <div className="btn__dropdown-combo__canceler__label__title">
                    Stop
                  </div>
                </div>
              </button>
            ) : (
              <div className="data-quality-relation-comparison-editor__actions-bar__run-group">
                <button
                  className="btn__dropdown-combo__label data-quality-relation-comparison-editor__actions-bar__run-btn"
                  onClick={runReconciliation}
                  title="Run Data Comparison"
                  disabled={isRunning}
                  tabIndex={-1}
                >
                  <PlayIcon className="btn__dropdown-combo__label__icon" />
                  <div className="btn__dropdown-combo__label__title">
                    Run Data Comparison
                  </div>
                </button>
                <ControlledDropdownMenu
                  className="btn__dropdown-combo__dropdown-btn data-quality-relation-comparison-editor__actions-bar__dropdown-btn"
                  disabled={isRunning}
                  content={
                    <MenuContent>
                      <MenuContentItem
                        className="btn__dropdown-combo__option"
                        onClick={runSourceQuery}
                      >
                        Run Source Query
                      </MenuContentItem>
                      <MenuContentItem
                        className="btn__dropdown-combo__option"
                        onClick={runTargetQuery}
                      >
                        Run Target Query
                      </MenuContentItem>
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'right',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'right',
                    },
                  }}
                >
                  <CaretDownIcon />
                </ControlledDropdownMenu>
              </div>
            )}
          </div>
        </div>
        <PanelContent>
          <div className="data-quality-relation-comparison-editor__queries">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel minSize={200}>
                <div className="data-quality-relation-comparison-editor__query-panel">
                  <div className="data-quality-relation-comparison-editor__query-panel__header">
                    <div className="data-quality-relation-comparison-editor__query-panel__title">
                      SOURCE QUERY
                    </div>
                  </div>
                  <div
                    className={clsx(
                      'data-quality-relation-comparison-editor__query-panel__content',
                      {
                        backdrop__element: Boolean(
                          state.sourceLambdaEditorState.parserError,
                        ),
                      },
                    )}
                  >
                    <LambdaEditor
                      className="data-quality-relation-comparison-editor__lambda-editor lambda-editor--dark"
                      disabled={
                        state.sourceLambdaEditorState
                          .isConvertingFunctionBodyToString
                      }
                      lambdaEditorState={state.sourceLambdaEditorState}
                      forceBackdrop={false}
                      autoFocus={false}
                    />
                  </div>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-250)" />
              </ResizablePanelSplitter>
              <ResizablePanel minSize={200}>
                <div className="data-quality-relation-comparison-editor__query-panel">
                  <div className="data-quality-relation-comparison-editor__query-panel__header">
                    <div className="data-quality-relation-comparison-editor__query-panel__title">
                      TARGET QUERY
                    </div>
                  </div>
                  <div
                    className={clsx(
                      'data-quality-relation-comparison-editor__query-panel__content',
                      {
                        backdrop__element: Boolean(
                          state.targetLambdaEditorState.parserError,
                        ),
                      },
                    )}
                  >
                    <LambdaEditor
                      className="data-quality-relation-comparison-editor__lambda-editor lambda-editor--dark"
                      disabled={
                        state.targetLambdaEditorState
                          .isConvertingFunctionBodyToString
                      }
                      lambdaEditorState={state.targetLambdaEditorState}
                      forceBackdrop={false}
                      autoFocus={false}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          <div className="data-quality-relation-comparison-editor__panel__content__form">
            {hasColumnFetchError && (
              <div className="data-quality-relation-comparison-editor__column-fetch-error">
                <ExclamationTriangleIcon className="data-quality-relation-comparison-editor__column-fetch-error__icon" />
                <span className="data-quality-relation-comparison-editor__column-fetch-error__message">
                  {columnFetchError}
                </span>
                <button
                  className="data-quality-relation-comparison-editor__column-fetch-error__retry-btn btn--dark btn--sm"
                  onClick={retryFetchColumns}
                  disabled={isFetchingColumns}
                  tabIndex={-1}
                >
                  <RefreshIcon />
                  <span>Retry</span>
                </button>
              </div>
            )}
            {hasNoOverlappingColumns && (
              <div className="data-quality-relation-comparison-editor__column-overlap-warning">
                <ExclamationTriangleIcon className="data-quality-relation-comparison-editor__column-overlap-warning__icon" />
                <span className="data-quality-relation-comparison-editor__column-overlap-warning__message">
                  No overlapping columns found between source and target
                  queries. The Keys and Columns to Compare selectors require at
                  least one common column name across both queries.
                </span>
              </div>
            )}
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Keys
              </div>
              <div className="panel__content__form__section__header__prompt">
                Columns used as join keys between source and target
              </div>
              <DataQualityMultiCustomSelector
                value={selectedKeyOptions}
                onChange={(values) =>
                  state.setKeys(values.map((option) => option.value))
                }
                options={combinedColumnOptions}
                placeholder="Select keys..."
                disabled={columnsDisabled}
                darkMode={darkMode}
              />
            </PanelFormSection>

            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Columns to Compare
              </div>
              <DataQualityMultiCustomSelector
                value={selectedColumnsToCompareOptions}
                onChange={(values) =>
                  state.setColumnsToCompare(
                    values.map((option) => option.value),
                  )
                }
                options={combinedColumnOptions}
                placeholder="Select columns to compare..."
                disabled={columnsDisabled}
                darkMode={darkMode}
              />
            </PanelFormSection>

            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Source Hash Column
              </div>
              <div className="panel__content__form__section__header__prompt">
                If a source hash column already exists you can specify it here
                (optional)
              </div>
              <CustomSelectorInput
                value={sourceHashColumnValue ?? null}
                options={sourceColumnOptions}
                onChange={(opt: { value: string; label: string } | null) => {
                  state.setSourceHashColumn(opt?.value);
                }}
                placeholder="Select source hash column..."
                isClearable={true}
                darkMode={darkMode}
                disabled={columnsDisabled}
              />
            </PanelFormSection>
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Target Hash Column
              </div>
              <div className="panel__content__form__section__header__prompt">
                If a target hash column already exists you can specify it here
                (optional)
              </div>
              <CustomSelectorInput
                value={targetHashColumnValue ?? null}
                options={targetColumnOptions}
                onChange={(opt: { value: string; label: string } | null) => {
                  state.setTargetHashColumn(opt?.value);
                }}
                placeholder="Select target hash column..."
                isClearable={true}
                darkMode={darkMode}
                disabled={columnsDisabled}
              />
            </PanelFormSection>
            <PanelFormBooleanField
              name="Aggregated Hash"
              prompt="Compare data at a group level using keys, or compare entire datasets as a whole when no keys are provided."
              value={md5Strategy.aggregatedHash}
              isReadOnly={false}
              update={(value) => state.setAggregatedHash(value)}
            />
          </div>

          <div className="data-quality-relation-comparison-editor__result">
            <div className="data-quality-relation-comparison-editor__result__header">
              <div className="data-quality-relation-comparison-editor__result__header-group">
                <div className="data-quality-relation-comparison-editor__result__title">
                  RESULT
                </div>
                {isRunning && (
                  <div className="data-quality-relation-comparison-editor__result__status">
                    {state.currentExecutionType ===
                    RECONCILIATION_EXECUTION_TYPE.RECONCILIATION
                      ? 'Running Data Comparison...'
                      : state.currentExecutionType ===
                          RECONCILIATION_EXECUTION_TYPE.SOURCE_QUERY
                        ? 'Running Source Query...'
                        : 'Running Target Query...'}
                  </div>
                )}
                <div className="data-quality-relation-comparison-editor__result__analytics">
                  {resultDescription ?? ''}
                </div>
              </div>
            </div>
            <div className="data-quality-relation-comparison-editor__result__content">
              <div className="data-quality-relation-comparison-editor__result__viewer">
                {renderResult()}
              </div>
            </div>
          </div>
        </PanelContent>
      </Panel>
    </div>
  );
});
