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
import SplitPane from 'react-split-pane';
import { useEditorStore } from '../../../stores/EditorStore';
import {
  createFilter,
  CustomSelectorInput,
  BlankPanelPlaceholder,
  PanelLoadingIndicator,
  PencilIcon,
} from '@finos/legend-studio-components';
import { FaPlay, FaScroll, FaSave, FaRobot } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import type { SelectComponent } from '@finos/legend-studio-components';
import { MappingEditorState } from '../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { useDrop } from 'react-dnd';
import type {
  MappingElementDragSource,
  MappingExecutionTargetDropTarget,
} from '../../../stores/shared/DnDUtil';
import { NewServiceModal } from '../../editor/edit-panel/service-editor/NewServiceModal';
import { CORE_DND_TYPE } from '../../../stores/shared/DnDUtil';
import Dialog from '@material-ui/core/Dialog';
import { TAB_SIZE, EDITOR_LANGUAGE } from '../../../stores/EditorConfig';
import {
  guaranteeType,
  uniq,
  compareLabelFn,
} from '@finos/legend-studio-shared';
import {
  MappingExecutionEmptyInputDataState,
  MappingExecutionObjectInputDataState,
  MappingExecutionFlatDataInputDataState,
} from '../../../stores/editor-state/element-editor-state/mapping/MappingExecutionState';
import { TextInputEditor } from '../../shared/TextInputEditor';
import { useApplicationStore } from '../../../stores/ApplicationStore';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import {
  getMappingElementTarget,
  getMappingElementSource,
} from '../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { RawLambda } from '../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import { SetImplementation } from '../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';

interface ClassMappingSelectOption {
  label: string;
  value: SetImplementation;
}

const ClassMappingSelectorModal = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    hideClassMappingSelectorModal: () => void;
    changeClassMapping: (
      setImplementation: SetImplementation | undefined,
    ) => void;
  }) => {
    const {
      mappingEditorState,
      changeClassMapping,
      hideClassMappingSelectorModal,
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
        onEnter={handleEnterClassMappingSelectorModal}
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
  (props: { mappingEditorState: MappingEditorState }) => {
    const { mappingEditorState } = props;
    const queryState = mappingEditorState.executionState.queryState;
    const editorStore = useEditorStore();
    const executionState = mappingEditorState.executionState;

    // Class mapping selector
    const [openClassMappingSelectorModal, setOpenClassMappingSelectorModal] =
      useState(false);
    const showClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(true);
    const hideClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(false);
    const changeClassMapping = useCallback(
      (setImplementation: SetImplementation | undefined): void => {
        executionState.setExecutionResultText(undefined);
        queryState.updateLamba(
          setImplementation
            ? editorStore.graphState.graphManager.HACKY_createGetAllLambda(
                guaranteeType(
                  getMappingElementTarget(setImplementation),
                  Class,
                ),
              )
            : RawLambda.createStub(),
        );
        hideClassMappingSelectorModal();
      },
      [editorStore, executionState, queryState],
    );

    // Drag and Drop
    const handleDrop = useCallback(
      (item: MappingExecutionTargetDropTarget): void => {
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
      <div className="panel mapping-execution-panel__query-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">query</div>
          </div>
          <div className="panel__header__actions">
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
            <div className="mapping-execution-panel__query-panel__query">
              <TextInputEditor
                inputValue={queryState.lambdaString}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.PURE}
                showMiniMap={false}
                hideGutter={true}
              />
            </div>
            <div className="mapping-execution-panel__query-panel__query-edit">
              {/* TODO: wire up query builder from extension here */}
              <button className="btn btn--dark">Edit Query</button>
            </div>
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

export const MappingExecutionFlatDataInputDataBuilder = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    inputDataState: MappingExecutionFlatDataInputDataState;
  }) => {
    const { inputDataState } = props;

    // TODO?: input type

    // Input Data
    const updateInput = (val: string): void =>
      inputDataState.inputData.setData(val);

    return (
      <div className="panel__content mapping-execution-panel__input-data-panel__content">
        <TextInputEditor
          language={EDITOR_LANGUAGE.TEXT}
          inputValue={inputDataState.inputData.data}
          updateInput={updateInput}
        />
      </div>
    );
  },
);

export const MappingExecutionObjectInputDataBuilder = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    inputDataState: MappingExecutionObjectInputDataState;
  }) => {
    const { inputDataState } = props;

    // Input Data
    const updateInput = (val: string): void =>
      inputDataState.inputData.setData(val);

    // TODO?: handle XML/type

    return (
      <div className="panel__content mapping-execution-panel__input-data-panel__content">
        <TextInputEditor
          language={EDITOR_LANGUAGE.JSON}
          inputValue={inputDataState.inputData.data}
          updateInput={updateInput}
        />
      </div>
    );
  },
);

export const MappingExecutionEmptyInputDataBuilder = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    inputDataState: MappingExecutionEmptyInputDataState;
    changeClassMapping: (
      setImplementation: SetImplementation | undefined,
    ) => void;
    showClassMappingSelectorModal: () => void;
  }) => {
    const { changeClassMapping, showClassMappingSelectorModal } = props;

    // Drag and Drop
    const handleDrop = useCallback(
      (item: MappingExecutionTargetDropTarget): void => {
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
  (props: { mappingEditorState: MappingEditorState }) => {
    const { mappingEditorState } = props;
    const inputDataState = mappingEditorState.executionState.inputDataState;

    // Class mapping selector
    const [openClassMappingSelectorModal, setOpenClassMappingSelectorModal] =
      useState(false);
    const showClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(true);
    const hideClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(false);
    const changeClassMapping = useCallback(
      (setImplementation: SetImplementation | undefined): void => {
        mappingEditorState.executionState.setInputDataStateBasedOnSource(
          setImplementation
            ? getMappingElementSource(setImplementation)
            : undefined,
          true,
        );
        mappingEditorState.executionState.setExecutionResultText(undefined);
        hideClassMappingSelectorModal();
      },
      [mappingEditorState.executionState],
    );

    // Input data builder
    let inputDataBuilder: React.ReactNode;
    if (inputDataState instanceof MappingExecutionEmptyInputDataState) {
      inputDataBuilder = (
        <MappingExecutionEmptyInputDataBuilder
          mappingEditorState={mappingEditorState}
          inputDataState={inputDataState}
          showClassMappingSelectorModal={showClassMappingSelectorModal}
          changeClassMapping={changeClassMapping}
        />
      );
    } else if (inputDataState instanceof MappingExecutionObjectInputDataState) {
      inputDataBuilder = (
        <MappingExecutionObjectInputDataBuilder
          mappingEditorState={mappingEditorState}
          inputDataState={inputDataState}
        />
      );
    } else if (
      inputDataState instanceof MappingExecutionFlatDataInputDataState
    ) {
      inputDataBuilder = (
        <MappingExecutionFlatDataInputDataBuilder
          mappingEditorState={mappingEditorState}
          inputDataState={inputDataState}
        />
      );
    } else {
      inputDataBuilder = null;
    }

    return (
      <div className="panel mapping-execution-panel__input-data-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">input data</div>
          </div>
          <div className="panel__header__actions">
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
          />
        )}
      </div>
    );
  },
);

export const MappingExecutionBuilder = observer(
  (props: { mappingEditorState: MappingEditorState }) => {
    const { mappingEditorState } = props;
    const applicationStore = useApplicationStore();
    const executionState = mappingEditorState.executionState;
    const { queryState, inputDataState, executionPlan } = executionState;
    // plan
    const closePlanViewer = (): void =>
      executionState.setExecutionPlan(undefined);
    const generatePlan = applicationStore.guaranteeSafeAction(() =>
      executionState.generatePlan(),
    );
    const planText = executionState.executionPlan
      ? JSON.stringify(executionState.executionPlan, undefined, TAB_SIZE)
      : '';
    // execution
    const execute = applicationStore.guaranteeSafeAction(() =>
      executionState.executeMapping(),
    );
    const executionResultText = executionState.executionResultText;
    // actions
    const promote = applicationStore.guaranteeSafeAction(() =>
      executionState.promoteToTest(),
    );
    const promoteToService = (): void =>
      executionState.setShowServicePathModal(true);

    return (
      <div className="mapping-execution-panel">
        <PanelLoadingIndicator
          isLoading={
            executionState.isExecuting || executionState.isGeneratingPlan
          }
        />
        <SplitPane
          split="vertical"
          defaultSize={500}
          minSize={500}
          maxSize={-250}
        >
          <SplitPane
            split="vertical"
            defaultSize={250}
            minSize={250}
            maxSize={-250}
          >
            {/* use UUID key to make sure these components refresh when we change the state */}
            <MappingExecutionQueryEditor
              key={executionState.queryState.uuid}
              mappingEditorState={mappingEditorState}
            />
            <MappingExecutionInputDataBuilder
              key={executionState.inputDataState.uuid}
              mappingEditorState={mappingEditorState}
            />
          </SplitPane>
          <div className="panel mapping-execution-panel__result-panel">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__label">result</div>
              </div>
              <div className="panel__header__actions">
                <button
                  className="panel__header__action"
                  disabled={
                    queryState.query.isStub ||
                    !inputDataState.isValid ||
                    executionState.isExecuting
                  }
                  onClick={execute}
                  tabIndex={-1}
                  title="Execute"
                >
                  <FaPlay />
                </button>
                <button
                  className="panel__header__action mapping-execution-panel__generate-plan-btn"
                  disabled={
                    queryState.query.isStub ||
                    !inputDataState.isValid ||
                    executionState.isGeneratingPlan
                  }
                  onClick={generatePlan}
                  tabIndex={-1}
                  title="View Execution Plan"
                >
                  <FaScroll />
                </button>
                {!mappingEditorState.isReadOnly && (
                  <button
                    className="panel__header__action"
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
                    <FaSave />
                  </button>
                )}
                {!mappingEditorState.isReadOnly && (
                  <button
                    className="panel__header__action"
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
              </div>
            </div>
            <div className="panel__content mapping-execution-panel__json-editor">
              <TextInputEditor
                inputValue={executionResultText ?? ''}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.JSON}
              />
            </div>
          </div>
        </SplitPane>
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
        <NewServiceModal
          mapping={mappingEditorState.mapping}
          close={(): void => executionState.setShowServicePathModal(false)}
          showModal={executionState.showServicePathModal}
          promoteToService={(
            name: string,
            packageName: string,
          ): Promise<void> =>
            executionState.promoteToService(name, packageName)
          }
          isReadOnly={mappingEditorState.isReadOnly}
        />
      </div>
    );
  },
);

export const MappingExecution = observer(() => {
  const editorStore = useEditorStore();
  const currentElementState = editorStore.currentEditorState;
  if (
    !currentElementState ||
    !(currentElementState instanceof MappingEditorState)
  ) {
    return (
      // TODO: we should hide this from the UI when we're not in Mapping state since execution only makes sense in the context of mapping
      <div className="mapping-execution-panel mapping-execution-panel--no-content">
        Execution supported only mappings as of now. Open a mapping to enable
        panel.
      </div>
    );
  }
  return <MappingExecutionBuilder mappingEditorState={currentElementState} />;
});
