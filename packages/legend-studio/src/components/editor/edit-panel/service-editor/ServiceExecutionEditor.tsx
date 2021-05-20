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

import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../../../../stores/EditorStore';
import { observer } from 'mobx-react-lite';
import { ServiceEditorState } from '../../../../stores/editor-state/element-editor-state/service/ServiceEditorState';
import {
  FaCog,
  FaExclamationTriangle,
  FaLongArrowAltRight,
} from 'react-icons/fa';
import {
  SERVICE_EXECUTION_TAB,
  ServicePureExecutionState,
} from '../../../../stores/editor-state/element-editor-state/service/ServiceExecutionState';
import {
  prettyCONSTName,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import SplitPane from 'react-split-pane';
import type { SingleExecutionTestState } from '../../../../stores/editor-state/element-editor-state/service/ServiceTestState';
import { EmbeddedRuntimeEditor } from '../../../editor/edit-panel/RuntimeEditor';
import { VscError } from 'react-icons/vsc';
import { useDrop } from 'react-dnd';
import type {
  ElementDragSource,
  UMLEditorElementDropTarget,
} from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import { UnsupportedEditorPanel } from '../../../editor/edit-panel/UnsupportedElementEditor';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import {
  clsx,
  BlankPanelContent,
  BlankPanelPlaceholder,
  CustomSelectorInput,
} from '@finos/legend-studio-components';
import { ServiceExecutionQueryEditor } from '../../../editor/edit-panel/service-editor/ServiceExecutionQueryEditor';
import { MappingIcon, RuntimeIcon } from '../../../shared/Icon';
import { ServiceTestEditor } from '../../../editor/edit-panel/service-editor/ServiceTestEditor';
import type { KeyedExecutionParameter } from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceExecution';
import {
  PureSingleExecution,
  PureMultiExecution,
} from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceExecution';
import type { PackageableElementSelectOption } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Mapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import type { Runtime } from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import { RuntimePointer } from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import { PackageableRuntime } from '../../../../models/metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';

const PureSingleExecutionConfigurationEditor = observer(
  (props: {
    executionState: ServicePureExecutionState;
    selectedExecution: PureSingleExecution | KeyedExecutionParameter;
    selectedTestState: SingleExecutionTestState;
  }) => {
    const { executionState, selectedExecution, selectedTestState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const serviceState = editorStore.getCurrentEditorState(ServiceEditorState);
    const isReadOnly = serviceState.isReadOnly;
    // mapping
    const isMappingEmpty = selectedExecution.mappingValidationResult;
    const mapping = selectedExecution.mapping.value;
    const mappingOptions = editorStore.mappingOptions;
    const noMappingLabel = (
      <div
        className="service-execution-editor__configuration__mapping-option--empty"
        title={isMappingEmpty?.messages.join('\n') ?? ''}
      >
        <div className="service-execution-editor__configuration__mapping-option--empty__label">
          (none)
        </div>
        <VscError />
      </div>
    );
    const selectedMappingOption = {
      value: mapping,
      label: isMappingEmpty ? noMappingLabel : mapping.path,
    };
    const onMappingSelectionChange = (
      val: PackageableElementSelectOption<Mapping>,
    ): void => {
      if (val.value !== mapping) {
        selectedExecution.setMapping(val.value);
        executionState.autoSelectRuntimeOnMappingChange(val.value);
        selectedTestState
          .generateTestData()
          .catch(applicationStore.alertIllegalUnhandledError);
      }
    };
    const visitMapping = (): void => editorStore.openElement(mapping);
    // runtime
    const runtime = selectedExecution.runtime;
    const isRuntimePointer = runtime instanceof RuntimePointer;
    const customRuntimeLabel = (
      <div className="service-execution-editor__configuration__runtime-option--custom">
        <FaCog />
        <div className="service-execution-editor__configuration__runtime-option--custom__label">
          (custom)
        </div>
      </div>
    );
    // only show custom runtime option when a runtime pointer is currently selected
    let runtimeOptions = !isRuntimePointer
      ? []
      : ([{ label: customRuntimeLabel }] as {
          label: string | React.ReactNode;
          value?: Runtime;
        }[]);
    const runtimes = editorStore.graphState.graph.runtimes.filter((rt) =>
      rt.runtimeValue.mappings.map((m) => m.value).includes(mapping),
    ); // only include runtime associated with the mapping
    runtimeOptions = runtimeOptions.concat(
      runtimes.map((rt) => ({
        label: rt.path,
        value: new RuntimePointer(
          PackageableElementExplicitReference.create(rt),
        ),
      })),
    );
    const runtimePointerWarning =
      runtime instanceof RuntimePointer &&
      !runtimes.includes(runtime.packageableRuntime.value) // if the runtime does not belong to the chosen mapping
        ? `runtime is not associated with specified mapping '${mapping.path}'`
        : undefined;
    const selectedRuntimeOption = {
      value: runtime,
      label:
        runtime instanceof RuntimePointer ? (
          <div
            className="service-execution-editor__configuration__runtime-option__pointer"
            title={undefined}
          >
            <div
              className={clsx(
                'service-execution-editor__configuration__runtime-option__pointer__label',
                {
                  'service-execution-editor__configuration__runtime-option__pointer__label--with-warning':
                    Boolean(runtimePointerWarning),
                },
              )}
            >
              {runtime.packageableRuntime.value.path}
            </div>
            {runtimePointerWarning && (
              <div
                className="service-execution-editor__configuration__runtime-option__pointer__warning"
                title={runtimePointerWarning}
              >
                <FaExclamationTriangle />
              </div>
            )}
          </div>
        ) : (
          customRuntimeLabel
        ),
    };
    const onRuntimeSelectionChange = (val: {
      label: string | React.ReactNode;
      value?: Runtime;
    }): void => {
      if (val.value === undefined) {
        executionState.useCustomRuntime();
      } else if (val.value !== runtime) {
        selectedExecution.setRuntime(val.value);
      }
    };
    const visitRuntime = (): void => {
      if (runtime instanceof RuntimePointer) {
        editorStore.openElement(runtime.packageableRuntime.value);
      }
    };
    const openRuntimeEditor = (): void => executionState.openRuntimeEditor();
    // DnD
    const handleMappingOrRuntimeDrop = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (!isReadOnly) {
          if (element instanceof Mapping) {
            selectedExecution.setMapping(element);
            selectedTestState
              .generateTestData()
              .catch(applicationStore.alertIllegalUnhandledError);
            executionState.autoSelectRuntimeOnMappingChange(element);
          } else if (
            element instanceof PackageableRuntime &&
            element.runtimeValue.mappings.map((m) => m.value).includes(mapping)
          ) {
            selectedExecution.setRuntime(
              new RuntimePointer(
                PackageableElementExplicitReference.create(element),
              ),
            );
          }
        }
      },
      [
        applicationStore.alertIllegalUnhandledError,
        executionState,
        isReadOnly,
        mapping,
        selectedExecution,
        selectedTestState,
      ],
    );
    const [{ isMappingOrRuntimeDragOver }, dropMappingOrRuntimeRef] = useDrop(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_MAPPING,
          CORE_DND_TYPE.PROJECT_EXPLORER_RUNTIME,
        ],
        drop: (item: ElementDragSource): void =>
          handleMappingOrRuntimeDrop(item),
        collect: (monitor): { isMappingOrRuntimeDragOver: boolean } => ({
          isMappingOrRuntimeDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleMappingOrRuntimeDrop],
    );
    // close runtime editor as we leave service editor
    useEffect(
      () => (): void => executionState.closeRuntimeEditor(),
      [executionState],
    );

    return (
      <div
        ref={dropMappingOrRuntimeRef}
        className="panel__content dnd__overlay__container"
      >
        <div
          className={clsx({
            dnd__overlay: isMappingOrRuntimeDragOver && !isReadOnly,
          })}
        />
        <div className="service-execution-editor__configuration__items">
          <div className="service-execution-editor__configuration__item">
            <div className="btn--sm service-execution-editor__configuration__item__label">
              <MappingIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown service-execution-editor__configuration__item__dropdown"
              disabled={isReadOnly}
              options={mappingOptions}
              onChange={onMappingSelectionChange}
              value={selectedMappingOption}
              darkMode={true}
              hasError={isMappingEmpty}
            />
            <button
              className="btn--dark btn--sm service-execution-editor__configuration__item__btn"
              onClick={visitMapping}
              tabIndex={-1}
              title={'See mapping'}
            >
              <FaLongArrowAltRight />
            </button>
          </div>
          <div className="service-execution-editor__configuration__item">
            <div className="btn--sm service-execution-editor__configuration__item__label">
              <RuntimeIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown service-execution-editor__configuration__item__dropdown"
              disabled={isReadOnly}
              options={runtimeOptions}
              onChange={onRuntimeSelectionChange}
              value={selectedRuntimeOption}
              darkMode={true}
            />
            {!isRuntimePointer && (
              <button
                className="btn--sm btn--dark service-execution-editor__configuration__item__btn"
                disabled={Boolean(isReadOnly || isMappingEmpty)}
                onClick={openRuntimeEditor}
                tabIndex={-1}
                title={isReadOnly ? 'See runtime' : 'Configure custom runtime'}
              >
                <FaCog />
              </button>
            )}
            {isRuntimePointer && (
              <button
                className="btn--sm btn--dark service-execution-editor__configuration__item__btn"
                onClick={visitRuntime}
                tabIndex={-1}
                title={'See runtime'}
              >
                <FaLongArrowAltRight />
              </button>
            )}
            <EmbeddedRuntimeEditor
              runtimeEditorState={executionState.runtimeEditorState}
              isReadOnly={serviceState.isReadOnly}
              onClose={(): void => executionState.closeRuntimeEditor()}
            />
          </div>
        </div>
      </div>
    );
  },
);

const PureSingleExecutionEditor = observer(
  (props: {
    executionState: ServicePureExecutionState;
    selectedExecution: PureSingleExecution | KeyedExecutionParameter;
    selectedTestState: SingleExecutionTestState;
  }) => {
    const { executionState, selectedExecution, selectedTestState } = props;
    // tab
    const selectedTab = executionState.selectedTab;
    const changeTab =
      (tab: SERVICE_EXECUTION_TAB): (() => void) =>
      (): void =>
        executionState.setSelectedTab(tab);
    // close runtime editor as we leave service editor
    useEffect(
      () => (): void => executionState.closeRuntimeEditor(),
      [executionState],
    );

    return (
      <div className="service-execution-editor__execution">
        <div className="panel">
          <div className="panel__header service-editor__header--with-tabs">
            <div className="uml-element-editor__tabs">
              {Object.values(SERVICE_EXECUTION_TAB).map((tab) => (
                <div
                  key={tab}
                  onClick={changeTab(tab)}
                  className={clsx('service-editor__tab', {
                    'service-editor__tab--active': tab === selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
          </div>
          <div className="panel__content service-editor__content">
            {selectedTab === SERVICE_EXECUTION_TAB.MAPPING_AND_RUNTIME && (
              <PureSingleExecutionConfigurationEditor
                executionState={executionState}
                selectedExecution={selectedExecution}
                selectedTestState={selectedTestState}
              />
            )}
            {selectedTab === SERVICE_EXECUTION_TAB.TESTS && (
              <ServiceTestEditor
                executionState={executionState}
                selectedTestState={selectedTestState}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);

const PureSingleExecutionEditorWrapper = observer(
  (props: { executionState: ServicePureExecutionState }) => {
    const { executionState } = props;
    const selectedExecution = executionState.selectedExecutionConfiguration;
    const selectedTestState = executionState.selectedSingeExecutionTestState;
    if (selectedExecution && selectedTestState) {
      return (
        <PureSingleExecutionEditor
          executionState={executionState}
          selectedExecution={selectedExecution}
          selectedTestState={selectedTestState}
        />
      );
    }
    return (
      <div className="service-execution-editor__execution">
        <BlankPanelContent>
          <div className="unsupported-element-editor__main">
            <div className="unsupported-element-editor__summary">{`No execution selected`}</div>
          </div>
        </BlankPanelContent>
      </div>
    );
  },
);

const PureExecutionEditor = observer(
  (props: {
    executionState: ServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const { executionState, isReadOnly } = props;
    const execution = executionState.execution;
    const editorStore = useEditorStore();
    const addKey = (): void =>
      editorStore.applicationStore.notifyError(
        'Multi key execution currently not supported',
      );

    return (
      <div className="service-execution-editor">
        <SplitPane
          split="horizontal"
          defaultSize={200}
          minSize={15}
          maxSize={800}
        >
          <ServiceExecutionQueryEditor
            executionState={executionState}
            isReadOnly={isReadOnly}
          />
          <div className="service-execution-editor__content">
            <div className="panel">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label service-editor__execution__label--test">
                    configuration
                  </div>
                </div>
              </div>
              <div className="panel__content service-execution-editor__configuration__content">
                <SplitPane
                  split="vertical"
                  defaultSize={250}
                  minSize={50}
                  maxSize={600}
                >
                  <div className="service-execution-editor__keys">
                    <div className="panel__header">
                      <div className="panel__header__title">
                        <div className="panel__header__title__label service-editor__execution__label--execution">
                          keys
                        </div>
                      </div>
                    </div>
                    <div className="panel__content">
                      <BlankPanelPlaceholder
                        placeholderText="Add a key"
                        onClick={addKey}
                        clickActionType="add"
                        tooltipText="Click to add a test"
                      />
                    </div>
                  </div>
                  {execution instanceof PureSingleExecution && (
                    <PureSingleExecutionEditorWrapper
                      executionState={executionState}
                    />
                  )}
                  {execution instanceof PureMultiExecution && (
                    <UnsupportedEditorPanel
                      text={`Can't display service multi-execution in form-mode`}
                      isReadOnly={isReadOnly}
                    />
                  )}
                </SplitPane>
              </div>
            </div>
          </div>
        </SplitPane>
      </div>
    );
  },
);

export const ServiceExecutionEditor = observer(() => {
  const editorStore = useEditorStore();
  const serviceState = editorStore.getCurrentEditorState(ServiceEditorState);
  const executionState = serviceState.executionState;
  const isReadOnly = serviceState.isReadOnly;

  // TODO: we might need support things like TDS execution in the future
  if (executionState instanceof ServicePureExecutionState) {
    return (
      <PureExecutionEditor
        executionState={executionState}
        isReadOnly={isReadOnly}
      />
    );
  }
  throw new UnsupportedOperationError();
});
