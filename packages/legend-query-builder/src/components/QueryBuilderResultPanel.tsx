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

import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import {
  BlankPanelContent,
  PanelLoadingIndicator,
  PlayIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  ContextMenu,
  clsx,
  PauseCircleIcon,
  ExclamationTriangleIcon,
  PanelContent,
  MenuContentDivider,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  type ExecutionResult,
  type Enumeration,
  InstanceValue,
  extractExecutionResultValues,
  TDSExecutionResult,
  RawExecutionResult,
  EXECUTION_SERIALIZATION_FORMAT,
  EnumValueInstanceValue,
  EnumValueExplicitReference,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  EDITOR_LANGUAGE,
  ExecutionPlanViewer,
  TAB_SIZE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  isBoolean,
  type PlainObject,
  prettyDuration,
} from '@finos/legend-shared';
import { forwardRef, useState } from 'react';
import type { CellMouseOverEvent } from '@ag-grid-community/core';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderProjectionColumnState,
} from '../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  type QueryBuilderPostFilterTreeNodeData,
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
} from '../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import {
  QueryBuilderPostFilterOperator_Equal,
  QueryBuilderPostFilterOperator_NotEqual,
} from '../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_Equal.js';
import {
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from '../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_In.js';
import type { QueryBuilderPostFilterOperator } from '../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterOperator.js';
import { QueryBuilderTDSState } from '../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import {
  instanceValue_setValue,
  instanceValue_setValues,
} from '../stores/shared/ValueSpecificationModifierHelper.js';
import { PARAMETER_SUBMIT_ACTION } from '../stores/shared/LambdaParameterState.js';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';

const QueryBuilderGridResultContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      event: CellMouseOverEvent | null;
      tdsState: QueryBuilderTDSState;
    }
  >(function QueryBuilderResultContextMenu(props, ref) {
    const { event, tdsState } = props;
    const applicationStore = useApplicationStore();
    const postFilterEqualOperator = new QueryBuilderPostFilterOperator_Equal();
    const postFilterInOperator = new QueryBuilderPostFilterOperator_In();
    const postFilterNotEqualOperator =
      new QueryBuilderPostFilterOperator_NotEqual();
    const postFilterNotInOperator = new QueryBuilderPostFilterOperator_NotIn();
    const postFilterState = tdsState.postFilterState;
    const projectionColumnState = guaranteeNonNullable(
      tdsState.projectionColumns
        .filter((c) => c.columnName === event?.column.getColId())
        .concat(
          tdsState.aggregationState.columns
            .filter((c) => c.columnName === event?.column.getColId())
            .map((ag) => ag.projectionColumnState),
        )[0],
    );

    const getExistingPostFilterNode = (
      operators: QueryBuilderPostFilterOperator[],
    ): QueryBuilderPostFilterTreeNodeData | undefined =>
      Array.from(postFilterState.nodes.values())
        .filter(
          (v) =>
            v instanceof QueryBuilderPostFilterTreeConditionNodeData &&
            v.condition.columnState instanceof
              QueryBuilderProjectionColumnState,
        )
        .filter(
          (n) =>
            (n as QueryBuilderPostFilterTreeConditionNodeData).condition
              .columnState.columnName === projectionColumnState.columnName &&
            operators
              .map((op) => op.getLabel())
              .includes(
                (
                  n as QueryBuilderPostFilterTreeConditionNodeData
                ).condition.operator.getLabel(),
              ),
        )[0];

    const updateFilterConditionValue = (
      conditionValue: InstanceValue,
    ): void => {
      if (event?.value !== null) {
        instanceValue_setValue(
          conditionValue,
          conditionValue instanceof EnumValueInstanceValue
            ? EnumValueExplicitReference.create(
                guaranteeNonNullable(
                  (
                    conditionValue.genericType?.ownerReference
                      .value as Enumeration
                  ).values.filter((v) => v.name === event?.value)[0],
                ),
              )
            : event?.value,
          0,
        );
      }
    };

    const generateNewPostFilterConditionNodeData = async (
      operator: QueryBuilderPostFilterOperator,
    ): Promise<void> => {
      let postFilterConditionState: PostFilterConditionState;
      try {
        postFilterConditionState = new PostFilterConditionState(
          postFilterState,
          projectionColumnState,
          undefined,
          operator,
        );
        if (
          projectionColumnState instanceof
          QueryBuilderDerivationProjectionColumnState
        ) {
          await flowResult(
            projectionColumnState.fetchDerivationLambdaReturnType(),
          );
        }
        const defaultFilterConditionValue =
          postFilterConditionState.operator.getDefaultFilterConditionValue(
            postFilterConditionState,
          );
        postFilterConditionState.setValue(defaultFilterConditionValue);
        updateFilterConditionValue(
          defaultFilterConditionValue as InstanceValue,
        );
      } catch (error) {
        assertErrorThrown(error);
        applicationStore.notificationService.notifyWarning(error.message);
        return;
      }
      postFilterState.addNodeFromNode(
        new QueryBuilderPostFilterTreeConditionNodeData(
          undefined,
          postFilterConditionState,
        ),
        undefined,
      );
    };

    const updateExistingPostFilterConditionNodeData = (
      existingPostFilterNode: QueryBuilderPostFilterTreeNodeData,
      isFilterBy: boolean,
    ): void => {
      const conditionState = (
        existingPostFilterNode as QueryBuilderPostFilterTreeConditionNodeData
      ).condition;
      if (
        conditionState.operator.getLabel() ===
        (isFilterBy
          ? postFilterEqualOperator
          : postFilterNotEqualOperator
        ).getLabel()
      ) {
        const doesValueAlreadyExist =
          conditionState.value instanceof InstanceValue &&
          (conditionState.value instanceof EnumValueInstanceValue
            ? conditionState.value.values.map((ef) => ef.value.name)
            : conditionState.value.values
          ).includes(event?.value);
        if (!doesValueAlreadyExist) {
          const currentValueSpecificaton = conditionState.value;
          const newValueSpecification =
            conditionState.operator.getDefaultFilterConditionValue(
              conditionState,
            );
          updateFilterConditionValue(newValueSpecification as InstanceValue);
          conditionState.changeOperator(
            isFilterBy ? postFilterInOperator : postFilterNotInOperator,
          );
          instanceValue_setValues(conditionState.value as InstanceValue, [
            currentValueSpecificaton,
            newValueSpecification,
          ]);
        }
      } else {
        const doesValueAlreadyExist =
          conditionState.value instanceof InstanceValue &&
          conditionState.value.values
            .filter((v) => v instanceof InstanceValue)
            .map((v) =>
              v instanceof EnumValueInstanceValue
                ? v.values.map((ef) => ef.value.name)
                : (v as InstanceValue).values,
            )
            .flat()
            .includes(event?.value);
        if (!doesValueAlreadyExist) {
          const newValueSpecification = (
            isFilterBy ? postFilterEqualOperator : postFilterNotEqualOperator
          ).getDefaultFilterConditionValue(conditionState);
          updateFilterConditionValue(newValueSpecification as InstanceValue);
          instanceValue_setValues(conditionState.value as InstanceValue, [
            ...(conditionState.value as InstanceValue).values,
            newValueSpecification,
          ]);
        }
      }
    };

    const filterByOrOut = (isFilterBy: boolean): void => {
      tdsState.setShowPostFilterPanel(true);
      const existingPostFilterNode = getExistingPostFilterNode(
        isFilterBy
          ? [postFilterEqualOperator, postFilterInOperator]
          : [postFilterNotEqualOperator, postFilterNotInOperator],
      );
      existingPostFilterNode === undefined
        ? generateNewPostFilterConditionNodeData(
            isFilterBy ? postFilterEqualOperator : postFilterNotEqualOperator,
          ).catch(applicationStore.alertUnhandledError)
        : updateExistingPostFilterConditionNodeData(
            existingPostFilterNode,
            isFilterBy,
          );
    };

    const handleCopyCellValue = applicationStore.guardUnhandledError(() =>
      applicationStore.clipboardService.copyTextToClipboard(event?.value),
    );

    const handleCopyRowValue = applicationStore.guardUnhandledError(() =>
      applicationStore.clipboardService.copyTextToClipboard(
        Object.values(event?.data).toString(),
      ),
    );

    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          onClick={(): void => {
            filterByOrOut(true);
          }}
        >
          Filter By
        </MenuContentItem>
        <MenuContentItem
          onClick={(): void => {
            filterByOrOut(false);
          }}
        >
          Filter Out
        </MenuContentItem>
        <MenuContentDivider />
        <MenuContentItem onClick={handleCopyCellValue}>
          Copy Cell Value
        </MenuContentItem>
        <MenuContentItem onClick={handleCopyRowValue}>
          Copy Row Value
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

const QueryBuilderGridResult = observer(
  (props: {
    executionResult: TDSExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;
    const fetchStructureImplementation =
      queryBuilderState.fetchStructureState.implementation;
    const [cellDoubleClickedEvent, setCellDoubleClickedEvent] =
      useState<CellMouseOverEvent | null>(null);
    const columns = executionResult.result.columns;
    let rowNumber = 1;
    const rowData = executionResult.result.rows.map((_row) => {
      const row: PlainObject = {};
      const cols = executionResult.result.columns;
      _row.values.forEach((value, idx) => {
        // `ag-grid` shows `false` value as empty string so we have
        // call `.toString()` to avoid this behavior.
        // See https://github.com/finos/legend-studio/issues/1008
        row[cols[idx] as string] = isBoolean(value) ? String(value) : value;
        row.rowNumber = rowNumber;
      });
      rowNumber += 1;
      return row;
    });

    return (
      <ContextMenu
        content={
          // NOTE: we only support this functionality for grid result with a projection fetch-structure
          fetchStructureImplementation instanceof QueryBuilderTDSState ? (
            <QueryBuilderGridResultContextMenu
              event={cellDoubleClickedEvent}
              tdsState={fetchStructureImplementation}
            />
          ) : null
        }
        disabled={
          !(fetchStructureImplementation instanceof QueryBuilderTDSState) ||
          !queryBuilderState.isQuerySupported ||
          !cellDoubleClickedEvent
        }
        menuProps={{ elevation: 7 }}
        key={executionResult._UUID}
        className={clsx('ag-theme-balham-dark query-builder__result__tds-grid')}
      >
        <AgGridReact
          rowData={rowData}
          gridOptions={{
            suppressScrollOnNewData: true,
            getRowId: function (data) {
              return data.data.rowNumber as string;
            },
          }}
          modules={[ClientSideRowModelModule]}
          // Note: we use onCellMouseOver as a bit of a workaround
          // since we use the context menu so we want the user to be
          // able to right click any cell and have the context menu
          // options use the data belonging to the row that they are
          // in. hence why we set the cell every time we mouse over
          // rather than making user click multiple times.
          onCellMouseOver={(event): void => {
            setCellDoubleClickedEvent(event);
          }}
          columnDefs={columns.map((colName) => ({
            minWidth: 50,
            sortable: true,
            resizable: true,
            field: colName,
            flex: 1,
          }))}
        />
      </ContextMenu>
    );
  },
);

const QueryBuilderResultValues = observer(
  (props: {
    executionResult: ExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;
    if (executionResult instanceof TDSExecutionResult) {
      return (
        <QueryBuilderGridResult
          queryBuilderState={queryBuilderState}
          executionResult={executionResult}
        />
      );
    } else if (executionResult instanceof RawExecutionResult) {
      return (
        <TextInputEditor
          language={EDITOR_LANGUAGE.TEXT}
          inputValue={executionResult.value}
          isReadOnly={true}
        />
      );
    }
    return (
      <TextInputEditor
        language={EDITOR_LANGUAGE.JSON}
        inputValue={JSON.stringify(
          extractExecutionResultValues(executionResult),
          null,
          TAB_SIZE,
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
    const USER_ATTESTATION_MESSAGE =
      'I attest that I am aware of the sensitive data leakage risk when exporting queried data. The data I export will only be used by me.';
    const exportQueryResults = async (
      format: EXECUTION_SERIALIZATION_FORMAT,
    ): Promise<void> => {
      if (queryBuilderState.parametersState.parameterStates.length) {
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

    const confirmExport = (format: EXECUTION_SERIALIZATION_FORMAT): void => {
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
    const queryValidationIssues = queryBuilderState.validationIssues;
    const isQueryValid =
      !queryBuilderState.isQuerySupported || !queryValidationIssues;
    const runQuery = (): void => {
      resultState.pressedRunQuery.inProgress();
      if (queryParametersState.parameterStates.length) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.runQuery()).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.RUN,
        );
        resultState.pressedRunQuery.complete();
      } else {
        flowResult(resultState.runQuery()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const cancelQuery = (): void => {
      resultState.setIsRunningQuery(false);
      queryBuilderState.resultState.setQueryRunPromise(undefined);
    };
    const generatePlan = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(false)),
    );
    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(true)),
    );

    const changeLimit: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      queryBuilderState.resultState.setPreviewLimit(
        val === '' ? 0 : parseInt(val, 10),
      );
    };
    const allowSettingPreviewLimit = queryBuilderState.isQuerySupported;

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
    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL}
        className="panel query-builder__result"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">result</div>
            {resultState.pressedRunQuery.isInProgress && (
              <div className="panel__header__title__label__status">
                Running Query...
              </div>
            )}
            <div className="query-builder__result__analytics">
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
            {allowSettingPreviewLimit && (
              <div className="query-builder__result__limit">
                <div className="query-builder__result__limit__label">
                  preview limit
                </div>
                <input
                  className="input--dark query-builder__result__limit__input"
                  spellCheck={false}
                  type="number"
                  value={resultState.previewLimit}
                  onChange={changeLimit}
                  disabled={!isQueryValid}
                />
              </div>
            )}
            {resultState.isRunningQuery ? (
              <button
                className="query-builder__result__stop-btn"
                onClick={cancelQuery}
                tabIndex={-1}
                disabled={!isQueryValid}
              >
                <div className="btn--dark btn--caution query-builder__result__stop-btn__label">
                  <PauseCircleIcon className="query-builder__result__stop-btn__label__icon" />
                  <div className="query-builder__result__stop-btn__label__title">
                    Stop
                  </div>
                </div>
              </button>
            ) : (
              <div className="query-builder__result__execute-btn">
                <button
                  className="query-builder__result__execute-btn__label"
                  onClick={runQuery}
                  tabIndex={-1}
                  title={
                    queryValidationIssues
                      ? `Query is not valid:\n${queryValidationIssues
                          .map((issue) => `\u2022 ${issue}`)
                          .join('\n')}`
                      : undefined
                  }
                  disabled={isRunQueryDisabled}
                >
                  <PlayIcon className="query-builder__result__execute-btn__label__icon" />
                  <div className="query-builder__result__execute-btn__label__title">
                    Run Query
                  </div>
                </button>
                <DropdownMenu
                  className="query-builder__result__execute-btn__dropdown-btn"
                  disabled={isRunQueryDisabled}
                  content={
                    <MenuContent>
                      <MenuContentItem
                        className="query-builder__result__execute-btn__option"
                        onClick={generatePlan}
                        disabled={isRunQueryDisabled}
                      >
                        Generate Plan
                      </MenuContentItem>
                      <MenuContentItem
                        className="query-builder__result__execute-btn__option"
                        onClick={debugPlanGeneration}
                        disabled={isRunQueryDisabled}
                      >
                        Debug
                      </MenuContentItem>
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                    transformOrigin: { vertical: 'top', horizontal: 'right' },
                  }}
                >
                  <CaretDownIcon />
                </DropdownMenu>
              </div>
            )}
            <DropdownMenu
              className="query-builder__result__export__dropdown"
              title="Export"
              disabled={!isQueryValid}
              content={
                <MenuContent>
                  {Object.values(EXECUTION_SERIALIZATION_FORMAT).map(
                    (format) => (
                      <MenuContentItem
                        key={format}
                        className="query-builder__result__export__dropdown__menu__item"
                        onClick={(): void => confirmExport(format)}
                      >
                        {format}
                      </MenuContentItem>
                    ),
                  )}
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
            </DropdownMenu>
          </div>
        </div>
        <PanelContent>
          <PanelLoadingIndicator
            isLoading={
              resultState.isRunningQuery ||
              resultState.isGeneratingPlan ||
              resultState.exportDataState.isInProgress
            }
          />
          {!executionResult && (
            <BlankPanelContent>
              Build or load a valid query first
            </BlankPanelContent>
          )}
          {executionResult && (
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
