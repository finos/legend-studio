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

import { Fragment, useState, useRef, useCallback } from 'react';
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
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  RefreshIcon,
  RobotIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  type MappingEditorState,
  getMappingElementSource,
  getMappingElementTarget,
  getMappingElementLabel,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { useDrop } from 'react-dnd';
import { NewServiceModal } from '../service-editor/NewServiceModal.js';
import {
  type MappingElementDragSource,
  CORE_DND_TYPE,
} from '../../../../stores/shared/DnDUtil.js';
import { guaranteeType, uniq } from '@finos/legend-shared';
import {
  type MappingExecutionState,
  MappingExecutionEmptyInputDataState,
  MappingExecutionObjectInputDataState,
  MappingExecutionFlatDataInputDataState,
  MappingExecutionRelationalInputDataState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingExecutionState.js';
import {
  EDITOR_LANGUAGE,
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
  ExecutionPlanViewer,
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
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor.js';
import type { DSLMapping_LegendStudioApplicationPlugin_Extension } from '../../../../stores/DSLMapping_LegendStudioApplicationPlugin_Extension.js';
import { objectInputData_setData } from '../../../../stores/graphModifier/DSLMapping_GraphModifierHelper.js';
import { flatData_setData } from '../../../../stores/graphModifier/StoreFlatData_GraphModifierHelper.js';
import {
  relationalInputData_setData,
  relationalInputData_setInputType,
} from '../../../../stores/graphModifier/StoreRelational_GraphModifierHelper.js';

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

    // Class mapping selector
    const classMappingSelectorRef = useRef<SelectComponent>(null);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: ClassMappingSelectOption): string =>
        getMappingElementLabel(option.value, editorStore).value,
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
        TransitionProps={{
          onEnter: handleEnterClassMappingSelectorModal,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <div className="modal search-modal">
          <div className="modal__title">Choose a class mapping</div>
          <CustomSelectorInput
            ref={classMappingSelectorRef}
            options={classMappingOptions}
            onChange={changeClassMappingOption}
            value={null}
            placeholder={'Choose a class mapping...'}
            filterOption={filterOption}
            isClearable={true}
          />
        </div>
      </Dialog>
    );
  },
);

export const getRelationalInputTestDataEditorLanguage = (
  type: RelationalInputType,
): EDITOR_LANGUAGE => {
  switch (type) {
    case RelationalInputType.SQL:
      return EDITOR_LANGUAGE.SQL;
    default:
      return EDITOR_LANGUAGE.TEXT;
  }
};

const MappingExecutionQueryEditor = observer(
  (props: { executionState: MappingExecutionState }) => {
    const { executionState } = props;
    const queryState = executionState.queryState;
    const mappingEditorState = executionState.mappingEditorState;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();

    const extraQueryEditorActions = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLMapping_LegendStudioApplicationPlugin_Extension
          ).getExtraMappingExecutionQueryEditorActionConfigurations?.() ?? [],
      )
      .map((config) => (
        <Fragment key={config.key}>{config.renderer(executionState)}</Fragment>
      ));

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
              ? editorStore.graphManagerState.graphManager.HACKY__createGetAllLambda(
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
              applicationStore.notifyWarning(
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
            editorStore.setActionAlertInfo({
              message: 'Mapping execution input data is already set',
              prompt: 'Do you want to regenerate the input data?',
              type: ActionAlertType.CAUTION,
              onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
              onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
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
    const [{ isDragOver, canDrop }, dropRef] = useDrop(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item: MappingElementDragSource): void => handleDrop(item),
        collect: (monitor): { isDragOver: boolean; canDrop: boolean } => ({
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
      <div className="panel mapping-execution-builder__query-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">query</div>
          </div>
          <div className="panel__header__actions">
            {extraQueryEditorActions}
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={clearQuery}
              title={'Clear query'}
            >
              <TimesIcon />
            </button>
          </div>
        </div>
        {!isStubbed_RawLambda(queryState.query) && (
          <div className="panel__content">
            <div className="mapping-execution-builder__query-panel__query">
              <StudioTextInputEditor
                inputValue={queryState.lambdaString}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.PURE}
                showMiniMap={false}
              />
            </div>
          </div>
        )}
        {isStubbed_RawLambda(queryState.query) && (
          <div ref={dropRef} className="panel__content">
            <BlankPanelPlaceholder
              placeholderText="Choose a class mapping"
              onClick={showClassMappingSelectorModal}
              clickActionType="add"
              tooltipText="Drop a class mapping, or click to choose one to start building the query"
              dndProps={{
                isDragOver: isDragOver,
                canDrop: canDrop,
              }}
            />
          </div>
        )}
        {openClassMappingSelectorModal && (
          <ClassMappingSelectorModal
            mappingEditorState={mappingEditorState}
            hideClassMappingSelectorModal={hideClassMappingSelectorModal}
            changeClassMapping={changeClassMapping}
          />
        )}
      </div>
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
      <div className="panel__content mapping-execution-builder__input-data-panel__content">
        <StudioTextInputEditor
          language={EDITOR_LANGUAGE.JSON}
          inputValue={inputDataState.inputData.data}
          updateInput={updateInput}
        />
      </div>
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
      <div className="panel__content mapping-execution-builder__input-data-panel__content">
        <StudioTextInputEditor
          language={EDITOR_LANGUAGE.TEXT}
          inputValue={inputDataState.inputData.data}
          updateInput={updateInput}
        />
      </div>
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
      <div className="panel__content mapping-execution-builder__input-data-panel__content">
        <StudioTextInputEditor
          language={getRelationalInputTestDataEditorLanguage(
            inputDataState.inputData.inputType,
          )}
          inputValue={inputDataState.inputData.data}
          updateInput={updateInput}
        />
      </div>
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
    const [{ isDragOver, canDrop }, dropRef] = useDrop(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item: MappingElementDragSource): void => handleDrop(item),
        collect: (monitor): { isDragOver: boolean; canDrop: boolean } => ({
          isDragOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );

    return (
      <div ref={dropRef} className="panel__content">
        <BlankPanelPlaceholder
          placeholderText="Choose a class mapping"
          onClick={showClassMappingSelectorModal}
          clickActionType="add"
          tooltipText="Drop a class mapping, or click to choose one to generate input data"
          dndProps={{
            isDragOver: isDragOver,
            canDrop: canDrop,
          }}
        />
      </div>
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
      <DropdownMenu
        className="mapping-execution-builder__input-data-panel__type-selector"
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
        <div
          className="mapping-execution-builder__input-data-panel__type-selector__value"
          title="Choose input data type..."
        >
          <div className="mapping-execution-builder__input-data-panel__type-selector__value__label">
            {inputDataState.inputData.inputType}
          </div>
          <CaretDownIcon />
        </div>
      </DropdownMenu>
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
              title={'Regenerate...'}
            >
              <RefreshIcon className="mapping-execution-builder__icon--refresh" />
            </button>
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={clearInputData}
              title={'Clear input data'}
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
            <button
              className="mapping-execution-builder__execute-btn"
              onClick={execute}
              disabled={
                isStubbed_RawLambda(queryState.query) ||
                !inputDataState.isValid ||
                executionState.isGeneratingPlan ||
                executionState.isExecuting
              }
              tabIndex={-1}
            >
              <div className="mapping-execution-builder__execute-btn__label">
                <PlayIcon className="mapping-execution-builder__execute-btn__label__icon" />
                <div className="mapping-execution-builder__execute-btn__label__title">
                  Run Query
                </div>
              </div>
              <DropdownMenu
                className="mapping-execution-builder__execute-btn__dropdown-btn"
                disabled={
                  isStubbed_RawLambda(queryState.query) ||
                  !inputDataState.isValid ||
                  executionState.isGeneratingPlan ||
                  executionState.isExecuting
                }
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="mapping-execution-builder__execute-btn__option"
                      onClick={generatePlan}
                    >
                      Generate Plan
                    </MenuContentItem>
                    <MenuContentItem
                      className="mapping-execution-builder__execute-btn__option"
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
              </DropdownMenu>
            </button>
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
              <div className="panel mapping-execution-builder__result-panel">
                <div className="panel__header">
                  <div className="panel__header__title">
                    <div className="panel__header__title__label">result</div>
                  </div>
                </div>
                <div className="panel__content mapping-execution-builder__result-panel__content">
                  <StudioTextInputEditor
                    inputValue={executionResultText ?? ''}
                    isReadOnly={true}
                    language={EDITOR_LANGUAGE.JSON}
                  />
                </div>
              </div>
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
