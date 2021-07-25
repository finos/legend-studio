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
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';
import { useEditorStore } from '../../../../stores/EditorStore';
import { flowResult } from 'mobx';
import {
  createFilter,
  CustomSelectorInput,
  BlankPanelPlaceholder,
  PanelLoadingIndicator,
  PencilIcon,
  TimesIcon,
  PlayIcon,
  FlaskIcon,
} from '@finos/legend-studio-components';
import { FaScroll, FaRobot } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import type { SelectComponent } from '@finos/legend-studio-components';
import type { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { useDrop } from 'react-dnd';
import type { MappingElementDragSource } from '../../../../stores/shared/DnDUtil';
import { NewServiceModal } from '../service-editor/NewServiceModal';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import Dialog from '@material-ui/core/Dialog';
import { TAB_SIZE, EDITOR_LANGUAGE } from '../../../../stores/EditorConfig';
import {
  guaranteeType,
  uniq,
  compareLabelFn,
  isNonNullable,
} from '@finos/legend-studio-shared';
import type { MappingExecutionState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingExecutionState';
import {
  MappingExecutionEmptyInputDataState,
  MappingExecutionObjectInputDataState,
  MappingExecutionFlatDataInputDataState,
  MappingExecutionRelationalInputDataState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingExecutionState';
import { TextInputEditor } from '../../../shared/TextInputEditor';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '../../../../stores/ApplicationStore';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import {
  getMappingElementTarget,
  getMappingElementSource,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import { SetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { OperationSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';

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

    // Class mapping selector
    const classMappingSelectorRef = useRef<SelectComponent>(null);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: ClassMappingSelectOption): string =>
        option.value.label.value,
    });
    const classMappingOptions = uniq(
      mappingEditorState.mapping.allClassMappings
        .filter(
          (classMapping) =>
            !classMappingFilterFn || classMappingFilterFn(classMapping),
        )
        .map((classMapping) => ({
          label: classMapping.label.value,
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

const MappingExecutionQueryEditor = observer(
  (props: { executionState: MappingExecutionState }) => {
    const { executionState } = props;
    const queryState = executionState.queryState;
    const mappingEditorState = executionState.mappingEditorState;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();

    const extraQueryEditors = applicationStore.pluginManager
      .getEditorPlugins()
      .flatMap(
        (plugin) =>
          plugin.getExtraMappingExecutionQueryEditorRendererConfigurations?.() ??
          [],
      )
      .filter(isNonNullable)
      .map((config) => (
        <Fragment key={config.key}>{config.renderer(executionState)}</Fragment>
      ));
    if (extraQueryEditors.length === 0) {
      extraQueryEditors.push(
        <Fragment key={'unsupported-query-editor'}>
          <div>{`No query editor available`}</div>
        </Fragment>,
      );
    }

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
              ? editorStore.graphState.graphManager.HACKY_createGetAllLambda(
                  guaranteeType(
                    getMappingElementTarget(setImplementation),
                    Class,
                  ),
                )
              : RawLambda.createStub(),
          ),
        ).catch(applicationStore.alertIllegalUnhandledError);
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
              editorStore.applicationStore.notifyWarning(
                `Can't auto-generate input data for operation class mapping. Please pick a concrete class mapping instead`,
              );
            } else {
              executionState.setInputDataStateBasedOnSource(
                getMappingElementSource(setImplementation),
                true,
              );
            }
          } else {
            editorStore.setActionAltertInfo({
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
                      getMappingElementSource(setImplementation),
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

    const clearQuery = (): Promise<void> =>
      flowResult(
        executionState.queryState.updateLamba(RawLambda.createStub()),
      ).catch(applicationStore.alertIllegalUnhandledError);

    return (
      <div className="panel mapping-execution-builder__query-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">query</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={clearQuery}
              title={'Clear query'}
            >
              <TimesIcon />
            </button>
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={showClassMappingSelectorModal}
              title={'Choose target...'}
            >
              <PencilIcon />
            </button>
          </div>
        </div>
        {!queryState.query.isStub && (
          <div className="panel__content">
            <ReflexContainer orientation="vertical">
              <ReflexElement minSize={250}>
                <div className="mapping-execution-builder__query-panel__query">
                  <TextInputEditor
                    inputValue={queryState.lambdaString}
                    isReadOnly={true}
                    language={EDITOR_LANGUAGE.PURE}
                    showMiniMap={false}
                  />
                </div>
              </ReflexElement>
              <ReflexSplitter />
              <ReflexElement size={250} minSize={250}>
                <div className="mapping-execution-builder__query-panel__query-editor">
                  {extraQueryEditors}
                </div>
              </ReflexElement>
            </ReflexContainer>
          </div>
        )}
        {queryState.query.isStub && (
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
      inputDataState.inputData.setData(val);

    return (
      <div className="panel__content mapping-execution-builder__input-data-panel__content">
        <TextInputEditor
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
      inputDataState.inputData.setData(val);

    return (
      <div className="panel__content mapping-execution-builder__input-data-panel__content">
        <TextInputEditor
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
      inputDataState.inputData.setData(val);

    // TODO: handle CSV input type

    return (
      <div className="panel__content mapping-execution-builder__input-data-panel__content">
        <TextInputEditor
          language={EDITOR_LANGUAGE.SQL}
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

export const MappingExecutionInputDataBuilder = observer(
  (props: { executionState: MappingExecutionState }) => {
    const { executionState } = props;
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
            ? getMappingElementSource(setImplementation)
            : undefined,
          true,
        );
        executionState.setExecutionResultText(undefined);
        hideClassMappingSelectorModal();
      },
      [executionState],
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
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={clearInputData}
              title={'Clear input data'}
            >
              <TimesIcon />
            </button>
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={showClassMappingSelectorModal}
              title={'Choose a class mapping...'}
            >
              <PencilIcon />
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
    const { queryState, inputDataState, executionPlan } = executionState;
    // plan
    const closePlanViewer = (): void =>
      executionState.setExecutionPlan(undefined);
    const generatePlan = applicationStore.guaranteeSafeAction(() =>
      flowResult(executionState.generatePlan()),
    );
    const planText = executionState.executionPlan
      ? JSON.stringify(executionState.executionPlan, undefined, TAB_SIZE)
      : '';
    // execution
    const execute = applicationStore.guaranteeSafeAction(() =>
      flowResult(executionState.executeMapping()),
    );
    const executionResultText = executionState.executionResultText;
    // actions
    const promote = applicationStore.guaranteeSafeAction(() =>
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
            <button
              className="mapping-execution-builder__header__action"
              disabled={
                queryState.query.isStub ||
                !inputDataState.isValid ||
                executionState.isExecuting
              }
              onClick={execute}
              tabIndex={-1}
              title="Execute"
            >
              <PlayIcon className="mapping-execution-builder__icon__execute" />
            </button>
            <button
              className="mapping-execution-builder__header__action"
              disabled={
                queryState.query.isStub ||
                !inputDataState.isValid ||
                executionState.isGeneratingPlan
              }
              onClick={generatePlan}
              tabIndex={-1}
              title="View Execution Plan"
            >
              <FaScroll className="mapping-execution-builder__icon__generate-plan" />
            </button>
            {!mappingEditorState.isReadOnly && (
              <button
                className="mapping-execution-builder__header__action"
                disabled={
                  queryState.query.isStub ||
                  !inputDataState.isValid ||
                  executionState.isExecuting ||
                  !executionState.executionResultText
                }
                onClick={promoteToService}
                tabIndex={-1}
                title="Promote to Service..."
              >
                <FaRobot />
              </button>
            )}
            {!mappingEditorState.isReadOnly && (
              <button
                className="mapping-execution-builder__header__action"
                disabled={
                  queryState.query.isStub ||
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
          </div>
        </div>
        <div className="mapping-execution-builder__content">
          <ReflexContainer orientation="horizontal">
            <ReflexElement size={250} minSize={28}>
              {/* use UUID key to make sure these components refresh when we change the state */}
              <MappingExecutionQueryEditor
                key={executionState.queryState.uuid}
                executionState={executionState}
              />
            </ReflexElement>
            <ReflexSplitter />
            <ReflexElement size={250} minSize={28}>
              <MappingExecutionInputDataBuilder
                key={executionState.inputDataState.uuid}
                executionState={executionState}
              />
            </ReflexElement>
            <ReflexSplitter />
            <ReflexElement minSize={28}>
              <div className="panel mapping-execution-builder__result-panel">
                <div className="panel__header">
                  <div className="panel__header__title">
                    <div className="panel__header__title__label">result</div>
                  </div>
                </div>
                <div className="panel__content mapping-execution-builder__result-panel__content">
                  <TextInputEditor
                    inputValue={executionResultText ?? ''}
                    isReadOnly={true}
                    language={EDITOR_LANGUAGE.JSON}
                  />
                </div>
              </div>
            </ReflexElement>
          </ReflexContainer>
        </div>
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
                className="btn modal__footer__close-btn"
                onClick={closePlanViewer}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
        <NewServiceModal
          mapping={mappingEditorState.mapping}
          close={(): void => executionState.setShowServicePathModal(false)}
          showModal={executionState.showServicePathModal}
          promoteToService={(
            name: string,
            packagePath: string,
          ): Promise<void> =>
            flowResult(executionState.promoteToService(name, packagePath))
          }
          isReadOnly={mappingEditorState.isReadOnly}
        />
      </div>
    );
  },
);
