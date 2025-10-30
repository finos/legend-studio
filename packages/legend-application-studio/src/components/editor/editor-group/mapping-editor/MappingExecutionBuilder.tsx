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

import { useState, useRef, useCallback } from 'react';
import { flowResult } from 'mobx';
import {
  Dialog,
  type SelectComponent,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  createFilter,
  CustomSelectorInput,
  BlankPanelPlaceholder,
  PanelLoadingIndicator,
  TimesIcon,
  PlayIcon,
  FlaskIcon,
  ResizablePanelSplitterLine,
  compareLabelFn,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  RefreshIcon,
  RobotIcon,
  PanelDropZone,
  PencilIcon,
  PanelContent,
  Modal,
  ModalTitle,
  clsx,
  PanelHeaderActionItem,
  PanelHeader,
  PanelHeaderActions,
  Panel,
  PauseCircleIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  type MappingEditorState,
  getMappingElementSource,
  getMappingElementTarget,
  getMappingElementLabel,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { useDrop } from 'react-dnd';
import { NewServiceModal } from '../service-editor/NewServiceModal.js';
import {
  type MappingElementDragSource,
  CORE_DND_TYPE,
} from '../../../../stores/editor/utils/DnDUtils.js';
import { assertErrorThrown, guaranteeType, uniq } from '@finos/legend-shared';
import {
  type MappingExecutionState,
  MappingExecutionEmptyInputDataState,
  MappingExecutionObjectInputDataState,
  MappingExecutionFlatDataInputDataState,
  MappingExecutionRelationalInputDataState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingExecutionState.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  Class,
  SetImplementation,
  OperationSetImplementation,
  getAllClassMappings,
  RelationalInputType,
  stub_RawLambda,
  isStubbed_RawLambda,
} from '@finos/legend-graph';
import { objectInputData_setData } from '../../../../stores/graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { flatData_setData } from '../../../../stores/graph-modifier/STO_FlatData_GraphModifierHelper.js';
import {
  relationalInputData_setData,
  relationalInputData_setInputType,
} from '../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';
import { MappingExecutionQueryBuilderState } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingExecutionQueryBuilderState.js';
import {
  ExecutionPlanViewer,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';

interface ClassMappingSelectOption {
  label: string;
  value: SetImplementation;
}

export const ClassMappingSelectorModal = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    hideClassMappingSelectorModal: () => void;
    changeClassMapping: (
      setImplementation: SetImplementation | undefined,
    ) => void;
    classMappingFilterFn?: (setImplementation: SetImplementation) => boolean;
  }) => {
    const {
      mappingEditorState,
      changeClassMapping,
      hideClassMappingSelectorModal,
      classMappingFilterFn,
    } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;

    // Class mapping selector
    const classMappingSelectorRef = useRef<SelectComponent>(null);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: ClassMappingSelectOption }): string =>
        getMappingElementLabel(option.data.value, editorStore).value,
    });
    const classMappingOptions = uniq(
      getAllClassMappings(mappingEditorState.mapping)
        .filter(
          (classMapping) =>
            !classMappingFilterFn || classMappingFilterFn(classMapping),
        )
        .map((classMapping) => ({
          label: getMappingElementLabel(classMapping, editorStore).value,
          value: classMapping,
        }))
        .sort(compareLabelFn),
    );
    const handleEnterClassMappingSelectorModal = (): void =>
      classMappingSelectorRef.current?.focus();
    const changeClassMappingOption = (val: ClassMappingSelectOption): void =>
      changeClassMapping(val.value);

    return (
      <Dialog
        open={true}
        onClose={hideClassMappingSelectorModal}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          transition: {
            onEnter: handleEnterClassMappingSelectorModal,
          },
          paper: {
            classes: { root: 'search-modal__inner-container' },
          },
        }}
      >
        <Modal
          className={clsx('search-modal', {
            'modal--dark': true,
          })}
        >
          <ModalTitle title="Choose a class mapping" />
          <CustomSelectorInput
            inputRef={classMappingSelectorRef}
            options={classMappingOptions}
            onChange={changeClassMappingOption}
            value={null}
            placeholder="Choose a class mapping..."
            filterOption={filterOption}
            isClearable={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </Modal>
      </Dialog>
    );
  },
);

export const getRelationalInputTestDataEditorLanguage = (
  type: RelationalInputType,
): CODE_EDITOR_LANGUAGE => {
  switch (type) {
    case RelationalInputType.SQL:
      return CODE_EDITOR_LANGUAGE.SQL;
    default:
      return CODE_EDITOR_LANGUAGE.TEXT;
  }
};

const MappingExecutionQueryEditor = observer(
  (props: { executionState: MappingExecutionState }) => {
    const { executionState } = props;
    const queryState = executionState.queryState;
    const mappingEditorState = executionState.mappingEditorState;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();

    // actions
    const editWithQueryBuilder = applicationStore.guardUnhandledError(
      async () => {
        const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
        await flowResult(
          embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
            setupQueryBuilderState: async (): Promise<QueryBuilderState> => {
              const queryBuilderState = new MappingExecutionQueryBuilderState(
                embeddedQueryBuilderState.editorStore.applicationStore,
                embeddedQueryBuilderState.editorStore.graphManagerState,
                executionState.mappingEditorState.mapping,
                editorStore.applicationStore.config.options.queryBuilderConfig,
                editorStore.editorMode.getSourceInfo(),
              );
              queryBuilderState.initializeWithQuery(
                executionState.queryState.query,
              );
              return queryBuilderState;
            },
            actionConfigs: [
              {
                key: 'save-query-btn',
                renderer: (
                  queryBuilderState: QueryBuilderState,
                ): React.ReactNode => {
                  const save = applicationStore.guardUnhandledError(
                    async (): Promise<void> => {
                      try {
                        const rawLambda = queryBuilderState.buildQuery();
                        await flowResult(
                          executionState.queryState.updateLamba(rawLambda),
                        );
                        applicationStore.notificationService.notifySuccess(
                          `Mapping execution query is updated`,
                        );
                        embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
                          undefined,
                        );
                      } catch (error) {
                        assertErrorThrown(error);
                        applicationStore.notificationService.notifyError(
                          `Can't save query: ${error.message}`,
                        );
                      }
                    },
                  );
                  return (
                    <button
                      className="query-builder__dialog__header__custom-action"
                      tabIndex={-1}
                      onClick={save}
                    >
                      Save Query
                    </button>
                  );
                },
              },
            ],
            disableCompile: isStubbed_RawLambda(
              executionState.queryState.query,
            ),
          }),
        );
      },
    );

    // Class mapping selector
    const [openClassMappingSelectorModal, setOpenClassMappingSelectorModal] =
      useState(false);
    const showClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(true);
    const hideClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(false);
    const changeClassMapping = useCallback(
      (setImplementation: SetImplementation | undefined): void => {
        // do all the necessary updates
        executionState.setExecutionResultText(undefined);
        flowResult(
          queryState.updateLamba(
            setImplementation
              ? editorStore.graphManagerState.graphManager.createGetAllRawLambda(
                  guaranteeType(
                    getMappingElementTarget(setImplementation),
                    Class,
                  ),
                )
              : stub_RawLambda(),
          ),
        ).catch(applicationStore.alertUnhandledError);
        hideClassMappingSelectorModal();

        // Attempt to generate data for input data panel as we pick the class mapping:
        // - If the source panel is empty right now, automatically try to generate input data:
        //   - We generate based on the class mapping, if it's concrete
        //   - If the class mapping is operation, output a warning message
        // - If the source panel is non-empty (show modal), show an option to keep current input data

        if (setImplementation) {
          if (
            executionState.inputDataState instanceof
            MappingExecutionEmptyInputDataState
          ) {
            if (setImplementation instanceof OperationSetImplementation) {
              applicationStore.notificationService.notifyWarning(
                `Can't auto-generate input data for operation class mapping. Please pick a concrete class mapping instead`,
              );
            } else {
              executionState.setInputDataStateBasedOnSource(
                getMappingElementSource(
                  setImplementation,
                  editorStore.pluginManager.getApplicationPlugins(),
                ),
                true,
              );
            }
          } else {
            applicationStore.alertService.setActionAlertInfo({
              message: 'Mapping execution input data is already set',
              prompt: 'Do you want to regenerate the input data?',
              type: ActionAlertType.CAUTION,
              actions: [
                {
                  label: 'Regenerate',
                  type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                  handler: (): void =>
                    executionState.setInputDataStateBasedOnSource(
                      getMappingElementSource(
                        setImplementation,
                        editorStore.pluginManager.getApplicationPlugins(),
                      ),
                      true,
                    ),
                },
                {
                  label: 'Keep my input data',
                  type: ActionAlertActionType.PROCEED,
                  default: true,
                },
              ],
            });
          }
        }

        // TODO: open query builder
      },
      [applicationStore, editorStore, executionState, queryState],
    );

    // Drag and Drop
    const handleDrop = useCallback(
      (item: MappingElementDragSource): void => {
        changeClassMapping(guaranteeType(item.data, SetImplementation));
      },
      [changeClassMapping],
    );
    const [{ isDragOver, canDrop }, dropConnector] = useDrop<
      MappingElementDragSource,
      void,
      { isDragOver: boolean; canDrop: boolean }
    >(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item) => handleDrop(item),
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );

    const clearQuery = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.queryState.updateLamba(stub_RawLambda())),
    );

    return (
      <Panel className="mapping-execution-builder__query-panel">
        <PanelHeader title="query">
          <PanelHeaderActions>
            <PanelHeaderActionItem
              onClick={editWithQueryBuilder}
              title="Edit query..."
            >
              <PencilIcon />
            </PanelHeaderActionItem>
            <PanelHeaderActionItem onClick={clearQuery} title="Clear query">
              <TimesIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        {!isStubbed_RawLambda(queryState.query) && (
          <PanelContent>
            <div className="mapping-execution-builder__query-panel__query">
              <CodeEditor
                inputValue={queryState.lambdaString}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.PURE}
                hideMinimap={true}
              />
            </div>
          </PanelContent>
        )}
        {isStubbed_RawLambda(queryState.query) && (
          <PanelContent>
            <PanelDropZone
              dropTargetConnector={dropConnector}
              isDragOver={isDragOver}
            >
              <BlankPanelPlaceholder
                text="Choose a class mapping"
                onClick={showClassMappingSelectorModal}
                clickActionType="add"
                tooltipText="Drop a class mapping, or click to choose one to start building the query"
                isDropZoneActive={canDrop}
              />
            </PanelDropZone>
          </PanelContent>
        )}
        {openClassMappingSelectorModal && (
          <ClassMappingSelectorModal
            mappingEditorState={mappingEditorState}
            hideClassMappingSelectorModal={hideClassMappingSelectorModal}
            changeClassMapping={changeClassMapping}
          />
        )}
      </Panel>
    );
  },
);

export const MappingExecutionObjectInputDataBuilder = observer(
  (props: { inputDataState: MappingExecutionObjectInputDataState }) => {
    const { inputDataState } = props;

    // TODO?: handle XML/type

    // Input data
    const updateInput = (val: string): void =>
      objectInputData_setData(inputDataState.inputData, val);

    return (
      <PanelContent className="mapping-execution-builder__input-data-panel__content">
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.JSON}
          inputValue={inputDataState.inputData.data}
          updateInput={updateInput}
        />
      </PanelContent>
    );
  },
);

export const MappingExecutionFlatDataInputDataBuilder = observer(
  (props: { inputDataState: MappingExecutionFlatDataInputDataState }) => {
    const { inputDataState } = props;

    // Input data
    const updateInput = (val: string): void =>
      flatData_setData(inputDataState.inputData, val);

    return (
      <PanelContent className="mapping-execution-builder__input-data-panel__content">
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.TEXT}
          inputValue={inputDataState.inputData.data}
          updateInput={updateInput}
        />
      </PanelContent>
    );
  },
);

/**
 * Right now, we always default this to use Local H2 connection.
 */
export const MappingExecutionRelationalInputDataBuilder = observer(
  (props: { inputDataState: MappingExecutionRelationalInputDataState }) => {
    const { inputDataState } = props;

    // Input data
    const updateInput = (val: string): void =>
      relationalInputData_setData(inputDataState.inputData, val);

    return (
      <PanelContent className="mapping-execution-builder__input-data-panel__content">
        <CodeEditor
          language={getRelationalInputTestDataEditorLanguage(
            inputDataState.inputData.inputType,
          )}
          inputValue={inputDataState.inputData.data}
          updateInput={updateInput}
        />
      </PanelContent>
    );
  },
);

export const MappingExecutionEmptyInputDataBuilder = observer(
  (props: {
    inputDataState: MappingExecutionEmptyInputDataState;
    changeClassMapping: (
      setImplementation: SetImplementation | undefined,
    ) => void;
    showClassMappingSelectorModal: () => void;
  }) => {
    const { changeClassMapping, showClassMappingSelectorModal } = props;

    // Drag and Drop
    const handleDrop = useCallback(
      (item: MappingElementDragSource): void => {
        changeClassMapping(guaranteeType(item.data, SetImplementation));
      },
      [changeClassMapping],
    );
    const [{ isDragOver, canDrop }, dropConnector] = useDrop<
      MappingElementDragSource,
      void,
      { isDragOver: boolean; canDrop: boolean }
    >(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item) => handleDrop(item),
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );

    return (
      <PanelContent>
        <PanelDropZone
          dropTargetConnector={dropConnector}
          isDragOver={isDragOver}
        >
          <BlankPanelPlaceholder
            text="Choose a class mapping"
            onClick={showClassMappingSelectorModal}
            clickActionType="add"
            tooltipText="Drop a class mapping, or click to choose one to generate input data"
            isDropZoneActive={canDrop}
          />
        </PanelDropZone>
      </PanelContent>
    );
  },
);

const RelationalMappingExecutionInputDataTypeSelector = observer(
  (props: { inputDataState: MappingExecutionRelationalInputDataState }) => {
    const { inputDataState } = props;

    const changeInputType =
      (val: string): (() => void) =>
      (): void => {
        relationalInputData_setInputType(inputDataState.inputData, val);
      };

    return (
      <ControlledDropdownMenu
        className="mapping-execution-builder__input-data-panel__type-selector"
        title="Choose input data type..."
        content={
          <MenuContent>
            {Object.keys(RelationalInputType).map((mode) => (
              <MenuContentItem
                key={mode}
                className="mapping-execution-builder__input-data-panel__type-selector__option"
                onClick={changeInputType(mode)}
              >
                {mode}
              </MenuContentItem>
            ))}
          </MenuContent>
        }
      >
        <div className="mapping-execution-builder__input-data-panel__type-selector__value">
          <div className="mapping-execution-builder__input-data-panel__type-selector__value__label">
            {inputDataState.inputData.inputType}
          </div>
          <CaretDownIcon />
        </div>
      </ControlledDropdownMenu>
    );
  },
);

export const MappingExecutionInputDataBuilder = observer(
  (props: { executionState: MappingExecutionState }) => {
    const { executionState } = props;
    const editorStore = useEditorStore();
    const mappingEditorState = executionState.mappingEditorState;
    const inputDataState = executionState.inputDataState;

    // Class mapping selector
    const [openClassMappingSelectorModal, setOpenClassMappingSelectorModal] =
      useState(false);
    const showClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(true);
    const hideClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(false);
    const changeClassMapping = useCallback(
      (setImplementation: SetImplementation | undefined): void => {
        executionState.setInputDataStateBasedOnSource(
          setImplementation
            ? getMappingElementSource(
                setImplementation,
                editorStore.pluginManager.getApplicationPlugins(),
              )
            : undefined,
          true,
        );
        executionState.setExecutionResultText(undefined);
        hideClassMappingSelectorModal();
      },
      [executionState, editorStore],
    );
    const classMappingFilterFn = (setImp: SetImplementation): boolean =>
      !(setImp instanceof OperationSetImplementation);

    // Input data builder
    let inputDataBuilder: React.ReactNode;
    if (inputDataState instanceof MappingExecutionEmptyInputDataState) {
      inputDataBuilder = (
        <MappingExecutionEmptyInputDataBuilder
          inputDataState={inputDataState}
          showClassMappingSelectorModal={showClassMappingSelectorModal}
          changeClassMapping={changeClassMapping}
        />
      );
    } else if (inputDataState instanceof MappingExecutionObjectInputDataState) {
      inputDataBuilder = (
        <MappingExecutionObjectInputDataBuilder
          inputDataState={inputDataState}
        />
      );
    } else if (
      inputDataState instanceof MappingExecutionFlatDataInputDataState
    ) {
      inputDataBuilder = (
        <MappingExecutionFlatDataInputDataBuilder
          inputDataState={inputDataState}
        />
      );
    } else if (
      inputDataState instanceof MappingExecutionRelationalInputDataState
    ) {
      inputDataBuilder = (
        <MappingExecutionRelationalInputDataBuilder
          inputDataState={inputDataState}
        />
      );
    } else {
      inputDataBuilder = null;
    }

    // input type builder
    let inputTypeSelector: React.ReactNode;
    if (inputDataState instanceof MappingExecutionRelationalInputDataState) {
      inputTypeSelector = (
        <RelationalMappingExecutionInputDataTypeSelector
          inputDataState={inputDataState}
        />
      );
    } else {
      inputTypeSelector = null;
    }

    const clearInputData = (): void =>
      executionState.setInputDataState(
        new MappingExecutionEmptyInputDataState(
          mappingEditorState.editorStore,
          mappingEditorState.mapping,
          undefined,
        ),
      );

    return (
      <div className="panel mapping-execution-builder__input-data-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">input data</div>
          </div>
          <div className="panel__header__actions">
            {inputTypeSelector}
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={showClassMappingSelectorModal}
              title="Regenerate..."
            >
              <RefreshIcon className="mapping-execution-builder__icon--refresh" />
            </button>
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={clearInputData}
              title="Clear input data"
            >
              <TimesIcon />
            </button>
          </div>
        </div>
        {inputDataBuilder}
        {openClassMappingSelectorModal && (
          <ClassMappingSelectorModal
            mappingEditorState={mappingEditorState}
            hideClassMappingSelectorModal={hideClassMappingSelectorModal}
            changeClassMapping={changeClassMapping}
            classMappingFilterFn={classMappingFilterFn}
          />
        )}
      </div>
    );
  },
);

export const MappingExecutionBuilder = observer(
  (props: { executionState: MappingExecutionState }) => {
    const { executionState } = props;
    const mappingEditorState = executionState.mappingEditorState;
    const applicationStore = useApplicationStore();
    const { queryState, inputDataState } = executionState;
    // execute
    const cancelExecution = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.cancelExecution()),
    );
    const generatePlan = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.generatePlan(false)),
    );
    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.generatePlan(true)),
    );
    const execute = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.executeMapping()),
    );
    const executionResultText = executionState.executionResultText;
    // actions
    const promote = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.promoteToTest()),
    );
    const promoteToService = (): void =>
      executionState.setShowServicePathModal(true);

    return (
      <div className="mapping-execution-builder">
        <PanelLoadingIndicator
          isLoading={
            executionState.isExecuting || executionState.isGeneratingPlan
          }
        />
        <div className="mapping-execution-builder__header">
          <div />
          <div className="mapping-execution-builder__header__actions">
            {!mappingEditorState.isReadOnly && (
              <button
                className="mapping-execution-builder__header__action"
                disabled={
                  isStubbed_RawLambda(queryState.query) ||
                  !inputDataState.isValid ||
                  executionState.isExecuting ||
                  !executionState.executionResultText
                }
                onClick={promoteToService}
                tabIndex={-1}
                title="Promote to Service..."
              >
                <RobotIcon />
              </button>
            )}
            {!mappingEditorState.isReadOnly && (
              <button
                className="mapping-execution-builder__header__action"
                disabled={
                  isStubbed_RawLambda(queryState.query) ||
                  !inputDataState.isValid ||
                  executionState.isExecuting ||
                  !executionState.executionResultText
                }
                onClick={promote}
                tabIndex={-1}
                title="Promote to Test"
              >
                <FlaskIcon />
              </button>
            )}
            <div className="mapping-execution-builder__action-btn btn__dropdown-combo btn__dropdown-combo--primary">
              {executionState.isExecuting ? (
                <button
                  className="btn__dropdown-combo__canceler"
                  onClick={cancelExecution}
                  tabIndex={-1}
                >
                  <div className="btn--dark btn--caution btn__dropdown-combo__canceler__label">
                    <PauseCircleIcon className="btn__dropdown-combo__canceler__label__icon" />
                    <div className="btn__dropdown-combo__canceler__label__title">
                      Stop
                    </div>
                  </div>
                </button>
              ) : (
                <>
                  <button
                    className="btn__dropdown-combo__label"
                    onClick={execute}
                    disabled={
                      isStubbed_RawLambda(queryState.query) ||
                      !inputDataState.isValid ||
                      executionState.isGeneratingPlan ||
                      executionState.isExecuting
                    }
                    tabIndex={-1}
                  >
                    <PlayIcon className="btn__dropdown-combo__label__icon" />
                    <div className="btn__dropdown-combo__label__title">
                      Run Query
                    </div>
                  </button>
                  <ControlledDropdownMenu
                    className="btn__dropdown-combo__dropdown-btn"
                    disabled={
                      isStubbed_RawLambda(queryState.query) ||
                      !inputDataState.isValid ||
                      executionState.isGeneratingPlan ||
                      executionState.isExecuting
                    }
                    content={
                      <MenuContent>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={generatePlan}
                        >
                          Generate Plan
                        </MenuContentItem>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={debugPlanGeneration}
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
                  </ControlledDropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mapping-execution-builder__content">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={250} minSize={28}>
              {/* use UUID key to make sure these components refresh when we change the state */}
              <MappingExecutionQueryEditor
                key={executionState.queryState.uuid}
                executionState={executionState}
              />
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-50)" />
            </ResizablePanelSplitter>
            <ResizablePanel size={250} minSize={28}>
              <MappingExecutionInputDataBuilder
                key={executionState.inputDataState.uuid}
                executionState={executionState}
              />
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-50)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={28}>
              <Panel className="mapping-execution-builder__result-panel">
                <PanelHeader title="result" />
                <PanelContent className="mapping-execution-builder__result-panel__content">
                  <CodeEditor
                    inputValue={executionResultText ?? ''}
                    isReadOnly={true}
                    language={CODE_EDITOR_LANGUAGE.JSON}
                  />
                </PanelContent>
              </Panel>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <ExecutionPlanViewer
          executionPlanState={executionState.executionPlanState}
        />
        <NewServiceModal
          mapping={mappingEditorState.mapping}
          close={(): void => executionState.setShowServicePathModal(false)}
          showModal={executionState.showServicePathModal}
          promoteToService={(
            packagePath: string,
            name: string,
          ): Promise<void> =>
            flowResult(executionState.promoteToService(packagePath, name))
          }
          isReadOnly={mappingEditorState.isReadOnly}
        />
      </div>
    );
  },
);
