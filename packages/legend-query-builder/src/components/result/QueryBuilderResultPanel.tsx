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
  BlankPanelContent,
  PlayIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  clsx,
  PauseCircleIcon,
  ExclamationTriangleIcon,
  PanelContent,
  Button,
  SQLIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelDivider,
  SquareIcon,
  CheckSquareIcon,
  MenuContentItemIcon,
  MenuContentItemLabel,
  ChartIcon,
  CsvIcon,
  DebugIcon,
  ReportIcon,
  CubesLoadingIndicatorIcon,
  CubesLoadingIndicator,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import {
  type ExecutionResult,
  extractExecutionResultValues,
  TDSExecutionResult,
  RawExecutionResult,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  DEFAULT_TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import { prettyDuration } from '@finos/legend-shared';
import { useRef, useState } from 'react';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { PARAMETER_SUBMIT_ACTION } from '../../stores/shared/LambdaParameterState.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { ExecutionPlanViewer } from '../execution-plan/ExecutionPlanViewer.js';
import { QueryUsageViewer } from '../QueryUsageViewer.js';
import { DocumentationLink } from '@finos/legend-lego/application';
import { QUERY_BUILDER_DOCUMENTATION_KEY } from '../../__lib__/QueryBuilderDocumentation.js';
import { QueryBuilderTDSSimpleGridResult } from './tds/QueryBuilderTDSSimpleGridResult.js';
import { getExecutedSqlFromExecutionResult } from './tds/QueryBuilderTDSResultShared.js';
import { QueryBuilderTDSGridResult } from './tds/QueryBuilderTDSGridResult.js';
import type { QueryBuilder_LegendApplicationPlugin_Extension } from '../../stores/QueryBuilder_LegendApplicationPlugin_Extension.js';
import type { QueryBuilderResultState } from '../../stores/QueryBuilderResultState.js';

const PERMISSION_ERRORS = ['permission denied', 'invalid user id or password'];

export const QueryBuilderExecutionErrorPanel = observer(
  (props: { resultState: QueryBuilderResultState }) => {
    const { resultState } = props;
    const queryBuilderState = resultState.queryBuilderState;
    const error = resultState.executionError;
    const errorMessage = error
      ? queryBuilderState.applicationStore.notificationService.getErrorMessage(
          error,
        )
      : '';
    const isPermissionDeniedError = () =>
      Boolean(
        PERMISSION_ERRORS.find((e) => errorMessage?.toLowerCase().includes(e)),
      );
    const openCheckEntitlmentsEditor = (): void => {
      queryBuilderState.checkEntitlementsState.setShowCheckEntitlementsViewer(
        true,
      );
    };

    return (
      error && (
        <>
          {isPermissionDeniedError() && (
            <div className="query-builder__result__permission-error">
              <div className="query-builder__result__permission-error__header">
                Entitlement / Authorization error - Please
              </div>
              <button
                className="query-builder__result__permission-error__button"
                disabled={
                  (queryBuilderState.isQuerySupported &&
                    queryBuilderState.fetchStructureState
                      .implementation instanceof QueryBuilderTDSState &&
                    queryBuilderState.fetchStructureState.implementation
                      .projectionColumns.length === 0) ||
                  !queryBuilderState.canBuildQuery
                }
                onClick={openCheckEntitlmentsEditor}
              >
                Click Here to Check Entitlements
              </button>
            </div>
          )}
          <div className="query-builder__result__execution-error">
            <div className="query-builder__result__execution-error__header">
              <span style={{ fontWeight: 'bold' }}>Error Execution Query</span>.
              Please try again later or review options in application`s
              <span style={{ fontWeight: 'bold' }}> Help</span> menu.
            </div>
            <div className="query-builder__result__execution-error__body">
              {errorMessage}
            </div>
          </div>
        </>
      )
    );
  },
);

export const QueryBuilderEmptyExecutionResultPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;

    const openCheckEntitlmentsEditor = (): void => {
      queryBuilderState.checkEntitlementsState.setShowCheckEntitlementsViewer(
        true,
      );
    };

    return (
      <div className="query-builder__result__empty-result-warning">
        <div className="query-builder__result__empty-result-warning__header">
          Query returned no data
        </div>
        <div className="query-builder__result__empty-result-warning__body">
          if you believe the query should return data, please
          <button
            className="query-builder__result__permission-error__button"
            disabled={
              (queryBuilderState.isQuerySupported &&
                queryBuilderState.fetchStructureState.implementation instanceof
                  QueryBuilderTDSState &&
                queryBuilderState.fetchStructureState.implementation
                  .projectionColumns.length === 0) ||
              !queryBuilderState.canBuildQuery
            }
            onClick={openCheckEntitlmentsEditor}
          >
            Click Here to Check Entitlements
          </button>
          or See Help menu for more options
        </div>
      </div>
    );
  },
);

export const QueryBuilderResultValues = observer(
  (props: {
    executionResult: ExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;
    if (executionResult instanceof TDSExecutionResult) {
      if (executionResult.result.rows.length === 0) {
        return (
          <QueryBuilderEmptyExecutionResultPanel
            queryBuilderState={queryBuilderState}
          />
        );
      } else {
        if (queryBuilderState.config?.TEMPORARY__enableGridEnterpriseMode) {
          return (
            <QueryBuilderTDSGridResult
              queryBuilderState={queryBuilderState}
              executionResult={executionResult}
            />
          );
        } else {
          return (
            <QueryBuilderTDSSimpleGridResult
              queryBuilderState={queryBuilderState}
              executionResult={executionResult}
            />
          );
        }
      }
    } else if (executionResult instanceof RawExecutionResult) {
      const inputValue =
        executionResult.value === null
          ? 'null'
          : executionResult.value.toString();
      return (
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.TEXT}
          inputValue={inputValue}
          isReadOnly={true}
        />
      );
    }
    return (
      <CodeEditor
        language={CODE_EDITOR_LANGUAGE.JSON}
        inputValue={JSON.stringify(
          extractExecutionResultValues(executionResult),
          null,
          DEFAULT_TAB_SIZE,
        )}
        isReadOnly={true}
      />
    );
  },
);

export const QueryBuilderResultPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const resultState = queryBuilderState.resultState;
    const queryParametersState = queryBuilderState.parametersState;
    const executionResult = resultState.executionResult;
    const [showSqlModal, setShowSqlModal] = useState(false);
    const executedSql = executionResult
      ? getExecutedSqlFromExecutionResult(executionResult, true)
      : undefined;

    const fetchStructureImplementation =
      queryBuilderState.fetchStructureState.implementation;
    const USER_ATTESTATION_MESSAGE =
      'I attest that I am aware of the sensitive data leakage risk when exporting queried data. The data I export will only be used by me.';
    const exportQueryResults = async (format: string): Promise<void> => {
      if (
        queryParametersState.parameterStates.length &&
        queryParametersState.parameterStates.find(
          (param) =>
            !queryBuilderState.milestoningState.isMilestoningParameter(
              param.parameter,
            ),
        )
      ) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.exportData(format)).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.EXPORT,
        );
      } else {
        await flowResult(resultState.exportData(format)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const confirmExport = (format: string): void => {
      applicationStore.alertService.setActionAlertInfo({
        message: USER_ATTESTATION_MESSAGE,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Accept',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: applicationStore.guardUnhandledError(() =>
              exportQueryResults(format),
            ),
          },
          {
            label: 'Decline',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    const allValidationIssues = queryBuilderState.allValidationIssues;

    const isSupportedQueryValid = allValidationIssues.length === 0;

    const isQueryValid =
      !queryBuilderState.isQuerySupported || isSupportedQueryValid;

    const isQueryValidForLocalMode =
      isQueryValid &&
      queryBuilderState.fetchStructureState.implementation instanceof
        QueryBuilderTDSState;

    const isExtraQueryUsageOptionsConfigured =
      applicationStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as QueryBuilder_LegendApplicationPlugin_Extension
            ).getExtraQueryUsageConfigurations?.() ?? [],
        ).length > 0;

    const runQuery = (): void => {
      resultState.setSelectedCells([]);
      resultState.setExecutionError(undefined);
      resultState.pressedRunQuery.inProgress();
      if (
        queryParametersState.parameterStates.length &&
        queryParametersState.parameterStates.find(
          (param) =>
            !queryBuilderState.milestoningState.isMilestoningParameter(
              param.parameter,
            ),
        )
      ) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.runQuery()).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.RUN,
        );
      } else {
        flowResult(resultState.runQuery()).catch(
          applicationStore.alertUnhandledError,
        );
      }
      resultState.pressedRunQuery.complete();
    };
    const cancelQuery = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.cancelQuery()),
    );

    const generatePlan = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(false)),
    );
    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(true)),
    );

    const allowSettingPreviewLimit = queryBuilderState.isQuerySupported;

    const allowSettingLocalMode =
      queryBuilderState.config?.TEMPORARY__enableGridEnterpriseMode;

    const copyExpression = (value: string): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(value)
        .then(() =>
          applicationStore.notificationService.notifySuccess(
            'SQL Query copied',
            undefined,
            2500,
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    };

    const isRunQueryDisabled =
      !isQueryValid ||
      resultState.isGeneratingPlan ||
      resultState.pressedRunQuery.isInProgress;

    const getResultSetDescription = (
      _executionResult: ExecutionResult,
    ): string | undefined => {
      const queryDuration = resultState.executionDuration
        ? prettyDuration(resultState.executionDuration, {
            ms: true,
          })
        : undefined;
      if (_executionResult instanceof TDSExecutionResult) {
        const rowLength = _executionResult.result.rows.length;
        return `${rowLength} row(s)${
          queryDuration ? ` in ${queryDuration}` : ''
        }`;
      }
      if (!queryDuration) {
        return undefined;
      }
      return `query ran in ${queryDuration}`;
    };
    const resultDescription = executionResult
      ? getResultSetDescription(executionResult)
      : undefined;

    const [previewLimitValue, setPreviewLimitValue] = useState(
      resultState.previewLimit,
    );

    const changePreviewLimit: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setPreviewLimitValue(parseInt(event.target.value, 10));
    };

    const inputRef = useRef<HTMLInputElement>(null);

    const getPreviewLimit = (): void => {
      if (isNaN(previewLimitValue) || previewLimitValue === 0) {
        setPreviewLimitValue(1);
        queryBuilderState.resultState.setPreviewLimit(1);
      } else {
        queryBuilderState.resultState.setPreviewLimit(previewLimitValue);
      }
      queryBuilderState.resultState.updatePreviewLimitInConfig();
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
      if (event.code === 'Enter') {
        getPreviewLimit();
        inputRef.current?.focus();
      } else if (event.code === 'Escape') {
        inputRef.current?.select();
      }
    };

    const toggleIsLocalModeEnabled = (): void => {
      resultState.setExecutionResult(undefined);
      queryBuilderState.setIsLocalModeEnabled(
        !queryBuilderState.isLocalModeEnabled,
      );
    };

    const extraExportMenuContentItems = applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as QueryBuilder_LegendApplicationPlugin_Extension
          ).getExtraQueryBuilderExportMenuActionConfigurations?.() ?? [],
      )
      .map((item) => (
        <MenuContentItem
          key={item.key}
          title={item.title ?? ''}
          disabled={item.disableFunc?.(queryBuilderState) ?? false}
          onClick={() => {
            item.onClick(queryBuilderState);
          }}
        >
          {item.icon && <MenuContentItemIcon>{item.icon}</MenuContentItemIcon>}
          <MenuContentItemLabel>{item.label}</MenuContentItemLabel>
        </MenuContentItem>
      ));

    const isLoading =
      resultState.isRunningQuery || resultState.isGeneratingPlan;

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL}
        className="panel query-builder__result"
      >
        {showSqlModal && executedSql && (
          <Dialog
            open={Boolean(showSqlModal)}
            onClose={() => setShowSqlModal(false)}
          >
            <Modal
              className="editor-modal"
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            >
              <ModalHeader title="Executed SQL Query" />
              <ModalBody className="query-builder__sql__modal">
                <>
                  <CodeEditor
                    inputValue={executedSql}
                    isReadOnly={true}
                    language={CODE_EDITOR_LANGUAGE.SQL}
                    hideMinimap={true}
                  />

                  <PanelDivider />
                </>
              </ModalBody>
              <ModalFooter>
                <ModalFooterButton
                  formatText={false}
                  onClick={() => copyExpression(executedSql)}
                  text="Copy SQL to Clipboard"
                />

                <ModalFooterButton
                  onClick={() => setShowSqlModal(false)}
                  text="Close"
                  type="secondary"
                />
              </ModalFooter>
            </Modal>
          </Dialog>
        )}

        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">results</div>
            {executedSql && (
              <Button
                onClick={() => setShowSqlModal(true)}
                title="Executed SQL"
                className="query-builder__result__sql__actions"
              >
                <SQLIcon />
              </Button>
            )}
            {resultState.pressedRunQuery.isInProgress && (
              <div className="panel__header__title__label__status">
                Running Query...
              </div>
            )}

            <div
              data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_ANALYTICS}
              className="query-builder__result__analytics"
            >
              {resultDescription ?? ''}
            </div>
            {executionResult && resultState.checkForStaleResults && (
              <div className="query-builder__result__stale-status">
                <div className="query-builder__result__stale-status__icon">
                  <ExclamationTriangleIcon />
                </div>
                <div className="query-builder__result__stale-status__label">
                  Preview data might be stale
                </div>
              </div>
            )}
          </div>
          <div className="panel__header__actions query-builder__result__header__actions">
            {resultState.exportState.isInProgress && (
              <div className="panel__header__title__label__status">
                Exporting...
              </div>
            )}
            {allowSettingLocalMode && (
              <div className="query-builder__result__advanced__mode">
                <div className="query-builder__result__advanced__mode__label">
                  Local Mode
                  <DocumentationLink
                    title="The grid in local mode performs all operations like grouping, sorting, filtering, etc after initial query execution locally withought reaching out to server. This limits the number of rows to smaller number so they can fit in memory"
                    documentationKey={
                      QUERY_BUILDER_DOCUMENTATION_KEY.QUESTION_HOW_TO_USE_LOCAL_GRID_MODE
                    }
                  />
                </div>
                <button
                  className={clsx(
                    'query-builder__result__advanced__mode__toggler__btn',
                    {
                      'query-builder__result__advanced__mode__toggler__btn--toggled':
                        queryBuilderState.isLocalModeEnabled,
                    },
                  )}
                  disabled={!isQueryValidForLocalMode}
                  onClick={toggleIsLocalModeEnabled}
                  tabIndex={-1}
                >
                  {queryBuilderState.isLocalModeEnabled ? (
                    <CheckSquareIcon />
                  ) : (
                    <SquareIcon />
                  )}
                </button>
              </div>
            )}

            {allowSettingPreviewLimit && (
              <div className="query-builder__result__limit">
                <div className="query-builder__result__limit__label">
                  preview row limit
                </div>
                <input
                  ref={inputRef}
                  className="input--dark query-builder__result__limit__input"
                  spellCheck={false}
                  type="number"
                  value={previewLimitValue}
                  onChange={changePreviewLimit}
                  onBlur={getPreviewLimit}
                  onKeyDown={onKeyDown}
                  disabled={!isQueryValid}
                />
              </div>
            )}

            <div className="query-builder__result__execute-btn btn__dropdown-combo btn__dropdown-combo--primary">
              {resultState.isRunningQuery ? (
                <button
                  className="btn__dropdown-combo__canceler query-builder__result__execute-btn__btn"
                  onClick={cancelQuery}
                  tabIndex={-1}
                  disabled={!isQueryValid}
                >
                  <div className="btn--dark btn--caution btn__dropdown-combo__canceler__label query-builder__result__execute-btn__btn">
                    <PauseCircleIcon />
                    Stop
                  </div>
                </button>
              ) : (
                <>
                  <button
                    className="btn__dropdown-combo__label query-builder__result__execute-btn__btn query-builder__result__execute-btn__btn--green"
                    onClick={runQuery}
                    tabIndex={-1}
                    title={
                      allValidationIssues.length
                        ? `Query is not valid:\n${allValidationIssues
                            .map((issue) => `\u2022 ${issue}`)
                            .join('\n')}`
                        : undefined
                    }
                    disabled={isRunQueryDisabled}
                  >
                    <PlayIcon />
                    Run Query
                  </button>
                  <ControlledDropdownMenu
                    className="btn__dropdown-combo__dropdown-btn query-builder__result__execute-btn__btn query-builder__result__execute-btn__btn--green"
                    disabled={isRunQueryDisabled}
                    content={
                      <MenuContent>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={generatePlan}
                          disabled={isRunQueryDisabled}
                        >
                          <MenuContentItemIcon>
                            <ReportIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>
                            Generate Plan
                          </MenuContentItemLabel>
                        </MenuContentItem>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={debugPlanGeneration}
                          disabled={isRunQueryDisabled}
                        >
                          <MenuContentItemIcon>
                            <DebugIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>Debug</MenuContentItemLabel>
                        </MenuContentItem>
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                      transformOrigin: { vertical: 'top', horizontal: 'right' },
                    }}
                  >
                    <CaretDownIcon />
                  </ControlledDropdownMenu>
                </>
              )}
            </div>
            <ControlledDropdownMenu
              className="query-builder__result__export__dropdown"
              title="Export"
              disabled={!isQueryValid}
              content={
                <MenuContent>
                  {Object.values(
                    fetchStructureImplementation.exportDataFormatOptions,
                  ).map((format) => (
                    <MenuContentItem
                      key={format}
                      onClick={(): void => confirmExport(format)}
                    >
                      <MenuContentItemIcon>
                        <CsvIcon />
                      </MenuContentItemIcon>
                      <MenuContentItemLabel>{format}</MenuContentItemLabel>
                    </MenuContentItem>
                  ))}
                  <MenuContentItem
                    onClick={(): void =>
                      resultState.setIsQueryUsageViewerOpened(true)
                    }
                    disabled={
                      queryBuilderState.changeDetectionState.hasChanged ||
                      !isExtraQueryUsageOptionsConfigured
                    }
                  >
                    <MenuContentItemIcon>
                      <ChartIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Others...</MenuContentItemLabel>
                  </MenuContentItem>
                  {extraExportMenuContentItems}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
            >
              <div className="query-builder__result__export__dropdown__label">
                Export
              </div>
              <div className="query-builder__result__export__dropdown__trigger">
                <CaretDownIcon />
              </div>
            </ControlledDropdownMenu>
            {resultState.isQueryUsageViewerOpened && (
              <QueryUsageViewer resultState={resultState} />
            )}
            {applicationStore.pluginManager
              .getApplicationPlugins()
              .flatMap(
                (plugin) =>
                  (
                    plugin as QueryBuilder_LegendApplicationPlugin_Extension
                  ).getExtraQueryBuilderExportMenuActionConfigurations?.() ??
                  [],
              )
              .map((item) => (
                <div key={item.key}>
                  {item.renderExtraComponent
                    ? item.renderExtraComponent(queryBuilderState)
                    : undefined}
                </div>
              ))}
          </div>
        </div>
        <PanelContent className="query-builder__result__content">
          <CubesLoadingIndicator isLoading={isLoading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {!executionResult && !isLoading && !resultState.executionError && (
            <BlankPanelContent>
              Build or load a valid query first
            </BlankPanelContent>
          )}
          {!isLoading && (
            <QueryBuilderExecutionErrorPanel resultState={resultState} />
          )}
          {executionResult && !isLoading && !resultState.executionError && (
            <div className="query-builder__result__values">
              <QueryBuilderResultValues
                executionResult={executionResult}
                queryBuilderState={queryBuilderState}
              />
            </div>
          )}
        </PanelContent>
        <ExecutionPlanViewer
          executionPlanState={resultState.executionPlanState}
        />
      </div>
    );
  },
);
