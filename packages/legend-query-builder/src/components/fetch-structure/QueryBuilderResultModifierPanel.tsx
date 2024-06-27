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
  clsx,
  Dialog,
  CustomSelectorInput,
  CheckSquareIcon,
  SquareIcon,
  TimesIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalFooterButton,
  InputWithInlineValidation,
  PanelDivider,
  PanelDropZone,
  PanelFormSection,
  ArrowUpIcon,
  ArrowDownIcon,
  PanelFormBooleanField,
  PanelFormListItems,
} from '@finos/legend-art';
import { SortColumnState } from '../../stores/fetch-structure/tds/QueryResultSetModifierState.js';
import {
  addUniqueEntry,
  clone,
  deepClone,
  deleteEntry,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';
import {
  COLUMN_SORT_TYPE,
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
} from '../../graph/QueryBuilderMetaModelConst.js';
import { useCallback, useEffect, useState } from 'react';
import type { QueryBuilderProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  VariableSelector,
  VariableViewer,
} from '../shared/QueryBuilderVariableSelector.js';
import {
  type ValueSpecification,
  VariableExpression,
  PrimitiveType,
  Multiplicity,
  areMultiplicitiesEqual,
  PRIMITIVE_TYPE,
  MILESTONING_START_DATE_PARAMETER_NAME,
  GenericType,
  GenericTypeExplicitReference,
  MILESTONING_END_DATE_PARAMETER_NAME,
  getMilestoneTemporalStereotype,
  BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
  PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
} from '@finos/legend-graph';
import {
  BasicValueSpecificationEditor,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
  type QueryBuilderVariableDragSource,
} from '../shared/BasicValueSpecificationEditor.js';
import { useDrop } from 'react-dnd';
import { MilestoningParameterEditor } from '../explorer/QueryBuilderMilestoningParameterEditor.js';
import { QueryBuilderSimpleConstantExpressionState } from '../../stores/QueryBuilderConstantsState.js';
import { LambdaParameterState } from '../../stores/shared/LambdaParameterState.js';

const ColumnSortEditor = observer(
  (props: {
    sortColumns: SortColumnState[];
    setSortColumns: (sortColumns: SortColumnState[]) => void;
    sortState: SortColumnState;
    tdsColumns: QueryBuilderTDSColumnState[];
  }) => {
    const { sortColumns, setSortColumns, sortState, tdsColumns } = props;
    const applicationStore = useApplicationStore();
    const projectionOptions = tdsColumns
      .filter(
        (projectionCol) =>
          projectionCol === sortState.columnState ||
          !sortColumns.some((sortCol) => sortCol.columnState === projectionCol),
      )
      .map((projectionCol) => ({
        label: projectionCol.columnName,
        value: projectionCol,
      }));
    const value = {
      label: sortState.columnState.columnName,
      value: sortState,
    };
    const sortType = sortState.sortType;

    const onChange = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (val !== null) {
        sortState.setColumnState(val.value);
      }
    };

    const deleteColumnSort = (): void => {
      const newSortColumns = [...sortColumns];
      deleteEntry(newSortColumns, sortState);
      setSortColumns(newSortColumns);
    };

    const changeSortBy = (): void => {
      if (sortState.sortType === COLUMN_SORT_TYPE.ASC) {
        sortState.setSortType(COLUMN_SORT_TYPE.DESC);
      } else {
        sortState.setSortType(COLUMN_SORT_TYPE.ASC);
      }
    };

    return (
      <div className="panel__content__form__section__list__item query-builder__projection__options__sort">
        <CustomSelectorInput
          className="query-builder__projection__options__sort__dropdown"
          options={projectionOptions}
          disabled={
            projectionOptions.length < 1 ||
            (projectionOptions.length === 1 && Boolean(value))
          }
          onChange={onChange}
          value={value}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
        <div className="query-builder__projection__options__sort__sortby">
          {sortType.toLowerCase()}
        </div>
        <button
          className="query-builder__projection__options__sort__sortby--btn btn--dark"
          tabIndex={-1}
          onClick={changeSortBy}
          title="Choose SortBy Operator..."
        >
          {sortState.sortType === COLUMN_SORT_TYPE.ASC ? (
            <ArrowUpIcon />
          ) : (
            <ArrowDownIcon />
          )}
        </button>
        <button
          className="query-builder__projection__options__sort__remove-btn btn--dark btn--caution"
          onClick={deleteColumnSort}
          tabIndex={-1}
          title="Remove"
          data-testid={
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL_SORT_REMOVE_BTN
          }
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

const ColumnsSortEditor = observer(
  (props: {
    projectionColumns: QueryBuilderProjectionColumnState[];
    sortColumns: SortColumnState[];
    setSortColumns: (sortColumns: SortColumnState[]) => void;
    tdsColumns: QueryBuilderTDSColumnState[];
  }) => {
    const { projectionColumns, sortColumns, setSortColumns, tdsColumns } =
      props;
    const projectionOptions = projectionColumns
      .filter(
        (projectionCol) =>
          !sortColumns.some((sortCol) => sortCol.columnState === projectionCol),
      )
      .map((projectionCol) => ({
        label: projectionCol.columnName,
        value: projectionCol,
      }));
    const addValue = (): void => {
      if (projectionOptions.length > 0) {
        const sortColumn = new SortColumnState(
          guaranteeNonNullable(projectionOptions[0]).value,
        );
        const newSortColumns = [...sortColumns];
        addUniqueEntry(newSortColumns, sortColumn);
        setSortColumns(newSortColumns);
      }
    };

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Sort and Order
        </div>
        <div className="panel__content__form__section__header__prompt">
          Choose the column(s) and order direction(s) that the results should be
          arranged by
        </div>
        <div className="panel__content__form__section__list">
          <div className="panel__content__form__section__list__items">
            {/* TODO: support DnD sorting */}
            {sortColumns.map((value) => (
              <ColumnSortEditor
                key={value.columnState.uuid}
                sortColumns={sortColumns}
                setSortColumns={setSortColumns}
                sortState={value}
                tdsColumns={tdsColumns}
              />
            ))}
          </div>
          <div className="panel__content__form__section__list__new-item__add">
            <button
              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
              disabled={!projectionOptions.length}
              onClick={addValue}
              tabIndex={-1}
            >
              Add Value
            </button>
          </div>
        </div>
      </div>
    );
  },
);

const cloneSortColumnStateArray = (
  sortColumns: SortColumnState[],
): SortColumnState[] =>
  sortColumns.map((sortColumn) => {
    const newSortColumn = new SortColumnState(sortColumn.columnState);
    newSortColumn.setSortType(sortColumn.sortType);
    return newSortColumn;
  });

export const QueryResultModifierModal = observer(
  (props: { tdsState: QueryBuilderTDSState }) => {
    const { tdsState } = props;
    const applicationStore = tdsState.queryBuilderState.applicationStore;

    // Read current state
    const resultSetModifierState = tdsState.resultSetModifierState;
    const stateSortColumns = resultSetModifierState.sortColumns;
    const stateDistinct = resultSetModifierState.distinct;
    const stateLimitResults = resultSetModifierState.limit;
    const stateSlice = resultSetModifierState.slice;

    // Set up temp state for modal lifecycle
    const [sortColumns, setSortColumns] = useState(
      cloneSortColumnStateArray(stateSortColumns),
    );
    const [distinct, setDistinct] = useState(stateDistinct);
    const [limitResults, setLimitResults] = useState(stateLimitResults);
    const [slice, setSlice] = useState<
      [number | undefined, number | undefined]
    >(stateSlice ?? [undefined, undefined]);
    const watermarkState = tdsState.queryBuilderState.watermarkState;
    const [watermarkValue, setWatermarkValue] = useState(
      deepClone(watermarkState.value),
    );

    // Sync temp state with tdsState when modal is opened/closed
    useEffect(() => {
      setSortColumns(cloneSortColumnStateArray(stateSortColumns));
      setDistinct(stateDistinct);
      setLimitResults(stateLimitResults);
      setSlice(stateSlice ?? [undefined, undefined]);
      setWatermarkValue(deepClone(watermarkState.value));
    }, [
      resultSetModifierState.showModal,
      watermarkState.value,
      stateSortColumns,
      stateDistinct,
      stateLimitResults,
      stateSlice,
    ]);

    const handleLimitResultsChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      const val = event.target.value.replace(/[^0-9]/g, '');
      setLimitResults(val === '' ? undefined : parseInt(val, 10));
    };

    const handleSliceChange = (
      start: number | undefined,
      end: number | undefined,
    ): void => {
      const newSlice: [number | undefined, number | undefined] = [start, end];
      setSlice(newSlice);
    };

    const changeSliceStart: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      const val = event.target.value.replace(/[^0-9]/g, '');
      if (val === '') {
        handleSliceChange(undefined, slice[1]);
      } else {
        const start = typeof val === 'number' ? val : parseInt(val, 10);
        handleSliceChange(start, slice[1]);
      }
    };
    const changeSliceEnd: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      const val = event.target.value.replace(/[^0-9]/g, '');
      if (val === '') {
        handleSliceChange(slice[0], undefined);
      } else {
        const end = typeof val === 'number' ? val : parseInt(val, 10);
        handleSliceChange(slice[0], end);
      }
    };

    // Error states
    const isInvalidSlice =
      (slice[0] === undefined && slice[1] !== undefined) ||
      (slice[0] !== undefined && slice[1] === undefined) ||
      (slice[0] !== undefined &&
        slice[1] !== undefined &&
        slice[0] >= slice[1]);

    // watermark
    const isParamaterCompatibleWithWaterMark = (
      parameter: VariableExpression,
    ): boolean =>
      PrimitiveType.STRING === parameter.genericType?.value.rawType &&
      areMultiplicitiesEqual(parameter.multiplicity, Multiplicity.ONE);
    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        setWatermarkValue(item.variable);
      },
      [setWatermarkValue],
    );
    const toggleWatermark = (): void => {
      if (watermarkValue) {
        setWatermarkValue(undefined);
      } else {
        setWatermarkValue(watermarkState.getDefaultValue());
      }
    };
    const [{ isParameterValueDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderVariableDragSource,
      void,
      { isParameterValueDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_VARIABLE_DND_TYPE],
        drop: (item, monitor): void => {
          if (
            !monitor.didDrop() &&
            // Only allows parameters with muliplicity 1 and type string
            isParamaterCompatibleWithWaterMark(item.variable)
          ) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isParameterValueDragOver: monitor.isOver({
            shallow: true,
          }),
        }),
      }),
      [handleDrop],
    );

    //milestoning config
    const isCompatibleMilestoningParameter = (
      variable: VariableExpression,
    ): boolean =>
      variable.genericType?.value.rawType.name === PRIMITIVE_TYPE.STRICTDATE ||
      variable.genericType?.value.rawType.name === PRIMITIVE_TYPE.LATESTDATE ||
      variable.genericType?.value.rawType.name === PRIMITIVE_TYPE.DATE ||
      variable.genericType?.value.rawType.name === PRIMITIVE_TYPE.DATETIME;

    const milestoningState = tdsState.queryBuilderState.milestoningState;
    const [parameterStates, setParameterStates] = useState(
      milestoningState.queryBuilderState.parametersState.parameterStates,
    );
    const filteredParameterStates = parameterStates.filter((p) =>
      isCompatibleMilestoningParameter(p.parameter),
    );
    const filteredConstantState =
      milestoningState.queryBuilderState.constantState.constants.filter((c) =>
        isCompatibleMilestoningParameter(c.variable),
      );

    const [isAllVersionsEnabled, setIsAllVersionsEnabled] = useState(
      milestoningState.isAllVersionsEnabled,
    );
    const [isAllVersionsInRangeEnabled, setIsAllVersionsInRangeEnabled] =
      useState(milestoningState.isAllVersionsInRangeEnabled);
    const [businessDate, setBusinessDate] = useState(
      milestoningState.businessDate,
    );
    const [processingDate, setProcessingDate] = useState(
      milestoningState.processingDate,
    );
    const [startDate, setStartDate] = useState(milestoningState.startDate);
    const [endDate, setEndDate] = useState(milestoningState.endDate);
    const [businessDateValue, setBusinessDateValue] = useState(
      milestoningState.getMilestoningParameterValue(
        milestoningState.businessDate,
      ),
    );
    const [processingDateValue, setProcessingDateValue] = useState(
      milestoningState.getMilestoningParameterValue(
        milestoningState.processingDate,
      ),
    );
    const [startDateValue, setStartDateValue] = useState(
      milestoningState.getMilestoningParameterValue(milestoningState.startDate),
    );
    const [endDateValue, setEndDateValue] = useState(
      milestoningState.getMilestoningParameterValue(milestoningState.endDate),
    );

    const shouldFilterMilestoningParamIfNotUsed = (
      param: ValueSpecification | undefined,
      resetParameter: (val: ValueSpecification | undefined) => void,
    ): ((lambdaParamState: LambdaParameterState) => boolean) => {
      if (param && param instanceof VariableExpression) {
        if (
          !milestoningState.queryBuilderState.isVariableUsed(param, {
            exculdeMilestoningState: true,
          })
        ) {
          resetParameter(undefined);
          return (lambdaParamState: LambdaParameterState) =>
            lambdaParamState.parameter.name !== param.name;
        }
      }
      return (lambdaParamState: LambdaParameterState) => true;
    };

    const setAllVersions = (value: boolean | undefined): void => {
      if (value) {
        //clean all unused milestoning parameters e.g. businessDate, ..., endDate.
        setParameterStates([
          ...parameterStates.filter(
            (ps) =>
              shouldFilterMilestoningParamIfNotUsed(
                businessDate,
                setBusinessDate,
              )(ps) &&
              shouldFilterMilestoningParamIfNotUsed(
                processingDate,
                setProcessingDate,
              )(ps) &&
              shouldFilterMilestoningParamIfNotUsed(
                startDate,
                setStartDate,
              )(ps) &&
              shouldFilterMilestoningParamIfNotUsed(endDate, setEndDate)(ps),
          ),
        ]);
      } else {
        //get or initialize getAll() parameters
        setIsAllVersionsInRangeEnabled(false);
        let newParamStates: LambdaParameterState[] = [];
        if (
          (!businessDate || !processingDate) &&
          milestoningState.queryBuilderState.class
        ) {
          const stereotype = getMilestoneTemporalStereotype(
            milestoningState.queryBuilderState.class,
            milestoningState.queryBuilderState.graphManagerState.graph,
          );
          if (stereotype) {
            const existingParamStates = parameterStates.map(
              (ps) => ps.variableName,
            );
            newParamStates = milestoningState
              .getMilestoningImplementation(stereotype)
              .buildParameterStatesFromMilestoningParameters()
              .filter((ps) => !existingParamStates.includes(ps.parameter.name));
          }
        }
        const allParamStates = [...newParamStates, ...parameterStates].filter(
          (ps) =>
            shouldFilterMilestoningParamIfNotUsed(
              startDate,
              setStartDate,
            )(ps) &&
            shouldFilterMilestoningParamIfNotUsed(endDate, setEndDate)(ps),
        );
        setParameterStates(allParamStates);
        if (!businessDate) {
          const lambdaParamState = allParamStates.find(
            (ps) =>
              ps.variableName ===
              (milestoningState.businessDate &&
              milestoningState.businessDate instanceof VariableExpression
                ? milestoningState.businessDate.name
                : BUSINESS_DATE_MILESTONING_PROPERTY_NAME),
          );
          setBusinessDate(lambdaParamState?.parameter);
          setBusinessDateValue(lambdaParamState?.value);
        }
        if (!processingDate) {
          const lambdaParamState = allParamStates.find(
            (ps) =>
              ps.variableName ===
              (milestoningState.businessDate &&
              milestoningState.processingDate instanceof VariableExpression
                ? milestoningState.processingDate.name
                : PROCESSING_DATE_MILESTONING_PROPERTY_NAME),
          );
          setProcessingDate(lambdaParamState?.parameter);
          setProcessingDateValue(lambdaParamState?.value);
        }
      }
      setIsAllVersionsEnabled(Boolean(value));
    };

    const getOrCreateNewLambdaParameterState = (
      lamdaStates: LambdaParameterState[],
      varName: string,
    ): LambdaParameterState => {
      const lamdaState = lamdaStates.find((ls) => ls.variableName === varName);
      if (lamdaState) {
        return lamdaState;
      } else {
        const varExp = new VariableExpression(
          varName,
          Multiplicity.ONE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATE),
          ),
        );
        const newParamState = new LambdaParameterState(
          varExp,
          milestoningState.queryBuilderState.observerContext,
          milestoningState.queryBuilderState.graphManagerState.graph,
        );
        newParamState.mockParameterValue();
        return newParamState;
      }
    };

    const buildAllVersionsInRangeParameters = (): void => {
      let startDateParameterState;
      let endDateParameterState;
      if (!(startDate && startDate instanceof VariableExpression)) {
        startDateParameterState = getOrCreateNewLambdaParameterState(
          parameterStates,
          MILESTONING_START_DATE_PARAMETER_NAME,
        );
        setStartDate(startDateParameterState.parameter);
        setStartDateValue(startDateParameterState.value);
      }
      if (!(endDate && endDate instanceof VariableExpression)) {
        endDateParameterState = getOrCreateNewLambdaParameterState(
          parameterStates,
          MILESTONING_END_DATE_PARAMETER_NAME,
        );
        setEndDate(endDateParameterState.parameter);
        setEndDateValue(endDateParameterState.value);
      }
      setParameterStates([
        ...new Set([
          ...parameterStates.filter(
            (ps) =>
              shouldFilterMilestoningParamIfNotUsed(
                businessDate,
                setBusinessDate,
              )(ps) &&
              shouldFilterMilestoningParamIfNotUsed(
                processingDate,
                setProcessingDate,
              )(ps),
          ),
          ...[startDateParameterState, endDateParameterState].filter(
            isNonNullable,
          ),
        ]),
      ]);
    };

    const setAllVersionsInRange = (value: boolean | undefined): void => {
      if (value) {
        buildAllVersionsInRangeParameters();
      } else {
        setAllVersions(true);
      }
      setIsAllVersionsInRangeEnabled(Boolean(value));
    };

    const resetMilestoningConfig = (): void => {
      setIsAllVersionsEnabled(milestoningState.isAllVersionsEnabled);
      setIsAllVersionsInRangeEnabled(
        milestoningState.isAllVersionsInRangeEnabled,
      );
      setStartDate(milestoningState.startDate);
      setEndDate(milestoningState.endDate);
      setBusinessDate(milestoningState.businessDate);
      setProcessingDate(milestoningState.processingDate);
      setParameterStates(
        milestoningState.queryBuilderState.parametersState.parameterStates,
      );
      setStartDateValue(
        milestoningState.getMilestoningParameterValue(
          milestoningState.startDate,
        ),
      );
      setEndDateValue(
        milestoningState.getMilestoningParameterValue(milestoningState.endDate),
      );
      setProcessingDateValue(
        milestoningState.getMilestoningParameterValue(
          milestoningState.processingDate,
        ),
      );
      setBusinessDateValue(
        milestoningState.getMilestoningParameterValue(
          milestoningState.businessDate,
        ),
      );
    };

    // Handle user actions
    const closeModal = (): void => {
      resetMilestoningConfig();
      resultSetModifierState.setShowModal(false);
    };

    const applyChanges = (): void => {
      resultSetModifierState.setSortColumns(sortColumns);
      resultSetModifierState.setDistinct(distinct);
      resultSetModifierState.setLimit(limitResults);
      if (slice[0] !== undefined && slice[1] !== undefined) {
        resultSetModifierState.setSlice([slice[0], slice[1]]);
      } else {
        resultSetModifierState.setSlice(undefined);
      }
      resultSetModifierState.setShowModal(false);
      watermarkState.setValue(watermarkValue);
      milestoningState.queryBuilderState.parametersState.setParameters(
        parameterStates,
      );
      if (isAllVersionsInRangeEnabled) {
        milestoningState.setStartDate(startDate);
        milestoningState.setEndDate(endDate);
        milestoningState.clearGetAllParameters();
        milestoningState.queryBuilderState.setGetAllFunction(
          QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
        );
        milestoningState.updateMilestoningParameterValue(
          startDate,
          startDateValue,
        );
        milestoningState.updateMilestoningParameterValue(endDate, endDateValue);
      } else if (isAllVersionsEnabled) {
        milestoningState.clearGetAllParameters();
        milestoningState.queryBuilderState.setGetAllFunction(
          QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
        );
      } else if (
        tdsState.queryBuilderState.milestoningState.isMilestonedQuery
      ) {
        milestoningState.clearAllVersionsInRangeParameters();
        milestoningState.setBusinessDate(businessDate);
        milestoningState.setProcessingDate(processingDate);
        milestoningState.queryBuilderState.setGetAllFunction(
          QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
        );
        milestoningState.updateMilestoningParameterValue(
          processingDate,
          processingDateValue,
        );
        milestoningState.updateMilestoningParameterValue(
          businessDate,
          businessDateValue,
        );
      }
      milestoningState.updateQueryBuilderState();
    };

    useEffect(() => {
      setIsAllVersionsEnabled(milestoningState.isAllVersionsEnabled);
      setIsAllVersionsInRangeEnabled(
        milestoningState.isAllVersionsInRangeEnabled,
      );
      setStartDate(milestoningState.startDate);
      setEndDate(milestoningState.endDate);
      setBusinessDate(milestoningState.businessDate);
      setProcessingDate(milestoningState.processingDate);
      setParameterStates(
        milestoningState.queryBuilderState.parametersState.parameterStates,
      );
      setStartDateValue(
        milestoningState.getMilestoningParameterValue(
          milestoningState.startDate,
        ),
      );
      setEndDateValue(
        milestoningState.getMilestoningParameterValue(milestoningState.endDate),
      );
      setProcessingDateValue(
        milestoningState.getMilestoningParameterValue(
          milestoningState.processingDate,
        ),
      );
      setBusinessDateValue(
        milestoningState.getMilestoningParameterValue(
          milestoningState.businessDate,
        ),
      );
    }, [
      milestoningState,
      milestoningState.isAllVersionsEnabled,
      milestoningState.isAllVersionsInRangeEnabled,
      milestoningState.queryBuilderState.parametersState.parameterStates,
      milestoningState.businessDate,
      milestoningState.processingDate,
      milestoningState.startDate,
      milestoningState.endDate,
      milestoningState.queryBuilderState.class,
    ]);

    return (
      <Dialog
        open={Boolean(resultSetModifierState.showModal)}
        onClose={closeModal}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal query-builder__projection__modal"
        >
          <ModalHeader title="Query Options" />
          <ModalBody className="query-builder__projection__modal__body">
            <div className="query-builder__projection__options">
              {tdsState.queryBuilderState.milestoningState
                .isMilestonedQuery && (
                <>
                  <div className="query-builder__projection__options__section-name">
                    Milestoning
                  </div>
                  {milestoningState.isCurrentClassMilestoned && (
                    <PanelFormBooleanField
                      isReadOnly={false}
                      value={isAllVersionsEnabled}
                      name="all Versions"
                      prompt="Query All Milestoned Versions of the Root Class"
                      update={setAllVersions}
                    />
                  )}
                  {isAllVersionsEnabled &&
                    milestoningState.isCurrentClassSupportsVersionsInRange && (
                      <>
                        <PanelFormBooleanField
                          isReadOnly={false}
                          value={isAllVersionsInRangeEnabled}
                          name=" All Versions In Range"
                          prompt="Optionally apply a date range to get All Versions for"
                          update={setAllVersionsInRange}
                        />
                        {isAllVersionsInRangeEnabled &&
                          startDate &&
                          endDate && (
                            <div className="query-builder__milestoning-panel__all-versions-in-range-editor">
                              <PanelFormSection>
                                <div className="panel__content__form__section__header__label">
                                  Start Date
                                </div>
                                <div className="panel__content__form__section__header__prompt">
                                  Choose a value for this milestoning parameter
                                </div>
                                <MilestoningParameterEditor
                                  queryBuilderState={
                                    milestoningState.queryBuilderState
                                  }
                                  parameter={startDate}
                                  setParameter={setStartDate}
                                  parameterValue={startDateValue}
                                  setParameterValue={setStartDateValue}
                                />
                              </PanelFormSection>
                              <PanelFormSection>
                                <div className="panel__content__form__section__header__label">
                                  End Date
                                </div>
                                <div className="panel__content__form__section__header__prompt">
                                  Choose a value for this milestoning parameter
                                </div>
                                <MilestoningParameterEditor
                                  queryBuilderState={
                                    milestoningState.queryBuilderState
                                  }
                                  parameter={endDate}
                                  setParameter={setEndDate}
                                  parameterValue={endDateValue}
                                  setParameterValue={setEndDateValue}
                                />
                              </PanelFormSection>
                            </div>
                          )}
                      </>
                    )}
                  {!isAllVersionsEnabled && (
                    <>
                      {processingDate && (
                        <PanelFormSection>
                          <div className="panel__content__form__section__header__label">
                            Processing Date
                          </div>
                          <div className="panel__content__form__section__header__prompt">
                            Choose a value for this milestoning parameter
                          </div>
                          <MilestoningParameterEditor
                            queryBuilderState={
                              milestoningState.queryBuilderState
                            }
                            parameter={processingDate}
                            setParameter={setProcessingDate}
                            parameterValue={processingDateValue}
                            setParameterValue={setProcessingDateValue}
                          />
                        </PanelFormSection>
                      )}
                      {businessDate && (
                        <PanelFormSection>
                          <div className="panel__content__form__section__header__label">
                            Business Date
                          </div>
                          <div className="panel__content__form__section__header__prompt">
                            Choose a value for this milestoning parameter
                          </div>
                          <MilestoningParameterEditor
                            queryBuilderState={
                              milestoningState.queryBuilderState
                            }
                            parameter={businessDate}
                            setParameter={setBusinessDate}
                            parameterValue={businessDateValue}
                            setParameterValue={setBusinessDateValue}
                          />
                        </PanelFormSection>
                      )}
                    </>
                  )}
                  {!(isAllVersionsEnabled && !isAllVersionsInRangeEnabled) && (
                    <>
                      <PanelFormSection>
                        <div className="panel__content__form__section__header__label">
                          List of compatible milestoning parameters
                        </div>
                      </PanelFormSection>
                      <div className="panel__content__form__section__list__items">
                        {filteredParameterStates.length > 0 && (
                          <PanelFormListItems title="Available parameters">
                            {filteredParameterStates.map((pState) => (
                              <VariableViewer
                                key={pState.uuid}
                                variable={pState.parameter}
                                isReadOnly={true}
                                queryBuilderState={
                                  milestoningState.queryBuilderState
                                }
                                option={{
                                  hideMilestoningParameterValueString: true,
                                }}
                              />
                            ))}
                          </PanelFormListItems>
                        )}
                        {Boolean(filteredConstantState.length) && (
                          <PanelFormListItems title="Available constants">
                            {filteredConstantState.map((constantState) => (
                              <VariableViewer
                                key={constantState.uuid}
                                variable={constantState.variable}
                                value={{
                                  val:
                                    constantState instanceof
                                    QueryBuilderSimpleConstantExpressionState
                                      ? constantState.value
                                      : undefined,
                                }}
                                queryBuilderState={
                                  milestoningState.queryBuilderState
                                }
                                isReadOnly={true}
                              />
                            ))}
                          </PanelFormListItems>
                        )}
                      </div>
                    </>
                  )}
                  <div className="query-builder__projection__options__section-name">
                    Other
                  </div>
                </>
              )}
              <ColumnsSortEditor
                projectionColumns={tdsState.projectionColumns}
                sortColumns={sortColumns}
                setSortColumns={setSortColumns}
                tdsColumns={tdsState.tdsColumns}
              />
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Eliminate Duplicate Rows
                </div>
                <div
                  className="panel__content__form__section__toggler"
                  onClick={() => setDistinct(!distinct)}
                >
                  <button
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          distinct,
                      },
                    )}
                    tabIndex={-1}
                  >
                    {distinct ? <CheckSquareIcon /> : <SquareIcon />}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Remove duplicate rows from the results
                  </div>
                </div>
              </div>
              <div className="panel__content__form__section">
                <label
                  htmlFor="query-builder__projection__modal__limit-results-input"
                  className="panel__content__form__section__header__label"
                >
                  Limit Results
                </label>
                <div className="panel__content__form__section__header__prompt">
                  Specify the maximum total number of rows the output will
                  produce
                </div>
                <input
                  id="query-builder__projection__modal__limit-results-input"
                  className="panel__content__form__section__input panel__content__form__section__number-input"
                  spellCheck={false}
                  type="text"
                  value={limitResults ?? ''}
                  onChange={handleLimitResultsChange}
                />
              </div>
              <div className="panel__content__form__section">
                <label
                  htmlFor="query-builder__projection__modal__slice-start-input"
                  className="panel__content__form__section__header__label"
                >
                  Slice
                </label>
                <div className="panel__content__form__section__header__prompt">
                  Reduce the number of rows in the provided TDS, selecting the
                  set of rows in the specified range between start and stop
                </div>
                <div className="query-builder__result__slice">
                  <div className="query-builder__result__slice__input__wrapper">
                    <InputWithInlineValidation
                      id="query-builder__projection__modal__slice-start-input"
                      className="input--dark query-builder__result__slice__input panel__content__form__section__input"
                      spellCheck={false}
                      value={slice[0] ?? ''}
                      onChange={changeSliceStart}
                      type="text"
                      error={isInvalidSlice ? 'Invalid slice' : undefined}
                    />
                  </div>
                  <div className="query-builder__result__slice__range">..</div>
                  <div className="query-builder__result__slice__input__wrapper">
                    <InputWithInlineValidation
                      className="input--dark query-builder__result__slice__input panel__content__form__section__input"
                      spellCheck={false}
                      value={slice[1] ?? ''}
                      onChange={changeSliceEnd}
                      type="text"
                      error={isInvalidSlice ? 'Invalid slice' : undefined}
                    />
                  </div>
                </div>
              </div>
              <>
                <PanelFormSection>
                  <label className="panel__content__form__section__header__label">
                    Watermark
                  </label>
                  <button
                    className={clsx(
                      'panel__content__form__section__toggler',
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          watermarkValue,
                      },
                    )}
                    onClick={toggleWatermark}
                    tabIndex={-1}
                  >
                    {watermarkValue ? <CheckSquareIcon /> : <SquareIcon />}
                    <div className="panel__content__form__section__toggler__prompt">
                      Enable Watermark
                    </div>
                  </button>
                </PanelFormSection>
                {watermarkValue && (
                  <>
                    <PanelFormSection>
                      <div
                        className="query-builder__variable-editor"
                        data-testid={
                          QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL__WATERMAKR
                        }
                      >
                        <PanelDropZone
                          isDragOver={isParameterValueDragOver}
                          dropTargetConnector={dropTargetConnector}
                        >
                          <BasicValueSpecificationEditor
                            valueSpecification={watermarkValue}
                            setValueSpecification={(
                              val: ValueSpecification,
                            ): void => {
                              setWatermarkValue(clone(val));
                            }}
                            graph={
                              watermarkState.queryBuilderState.graphManagerState
                                .graph
                            }
                            observerContext={
                              watermarkState.queryBuilderState.observerContext
                            }
                            typeCheckOption={{
                              expectedType: PrimitiveType.STRING,
                            }}
                            resetValue={() =>
                              setWatermarkValue(
                                watermarkState.getDefaultValue(),
                              )
                            }
                            isConstant={watermarkState.queryBuilderState.constantState.isValueSpecConstant(
                              watermarkValue,
                            )}
                          />
                        </PanelDropZone>
                      </div>
                    </PanelFormSection>
                    <PanelDivider />
                    <VariableSelector
                      filterBy={isParamaterCompatibleWithWaterMark}
                      queryBuilderState={tdsState.queryBuilderState}
                    />
                  </>
                )}
              </>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={applyChanges}
              text="Apply"
              disabled={isInvalidSlice}
            />
            <ModalFooterButton
              onClick={closeModal}
              text="Cancel"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
