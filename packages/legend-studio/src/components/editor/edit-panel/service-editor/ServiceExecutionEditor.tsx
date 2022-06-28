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
import { observer } from 'mobx-react-lite';
import { ServiceEditorState } from '../../../../stores/editor-state/element-editor-state/service/ServiceEditorState.js';
import {
  SERVICE_EXECUTION_TAB,
  ServicePureExecutionState,
} from '../../../../stores/editor-state/element-editor-state/service/ServiceExecutionState.js';
import {
  prettyCONSTName,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { LegacySingleExecutionTestState } from '../../../../stores/editor-state/element-editor-state/service/LegacyServiceTestState.js';
import { EmbeddedRuntimeEditor } from '../../../editor/edit-panel/RuntimeEditor.js';
import { useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/shared/DnDUtil.js';
import { UnsupportedEditorPanel } from '../../../editor/edit-panel/UnsupportedElementEditor.js';
import {
  clsx,
  BlankPanelContent,
  BlankPanelPlaceholder,
  CustomSelectorInput,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  ErrorIcon,
  CogIcon,
  LongArrowRightIcon,
  ExclamationTriangleIcon,
} from '@finos/legend-art';
import { ServiceExecutionQueryEditor } from '../../../editor/edit-panel/service-editor/ServiceExecutionQueryEditor.js';
import { ServiceTestEditor } from '../../../editor/edit-panel/service-editor/ServiceTestEditor.js';
import type { PackageableElementOption } from '../../../../stores/shared/PackageableElementOptionUtil.js';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type KeyedExecutionParameter,
  type Runtime,
  PureSingleExecution,
  PureMultiExecution,
  Mapping,
  RuntimePointer,
  PackageableRuntime,
  PackageableElementExplicitReference,
  validate_PureExecutionMapping,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  pureSingleExecution_setMapping,
  pureSingleExecution_setRuntime,
} from '../../../../stores/graphModifier/DSLService_GraphModifierHelper.js';
import { ServiceTestSuiteState } from '../../../../stores/editor-state/element-editor-state/service/ServiceTestSuiteState.js';

const PureSingleExecutionConfigurationEditor = observer(
  (props: {
    executionState: ServicePureExecutionState;
    selectedExecution: PureSingleExecution | KeyedExecutionParameter;
    selectedTestState: LegacySingleExecutionTestState | ServiceTestSuiteState;
  }) => {
    const { executionState, selectedExecution, selectedTestState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const serviceState = editorStore.getCurrentEditorState(ServiceEditorState);
    const isReadOnly = serviceState.isReadOnly;
    // mapping
    // TODO: this is not generic error handling, as there could be other problems
    // with mapping, we need to genericize this
    const isMappingEmpty = validate_PureExecutionMapping(selectedExecution);
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
        <ErrorIcon />
      </div>
    );
    const selectedMappingOption = {
      value: mapping,
      label: isMappingEmpty ? noMappingLabel : mapping.path,
    };
    const onMappingSelectionChange = (
      val: PackageableElementOption<Mapping>,
    ): void => {
      if (val.value !== mapping) {
        pureSingleExecution_setMapping(
          selectedExecution,
          val.value,
          editorStore.changeDetectionState.observerContext,
        );
        executionState.autoSelectRuntimeOnMappingChange(val.value);
        if (selectedTestState instanceof LegacySingleExecutionTestState) {
          flowResult(selectedTestState.generateTestData()).catch(
            applicationStore.alertUnhandledError,
          );
        }
      }
    };
    const visitMapping = (): void => editorStore.openElement(mapping);
    // runtime
    const runtime = selectedExecution.runtime;
    const isRuntimePointer = runtime instanceof RuntimePointer;
    const customRuntimeLabel = (
      <div className="service-execution-editor__configuration__runtime-option--custom">
        <CogIcon />
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
    // NOTE: for now, only include runtime associated with the mapping
    // TODO?: Should we bring the runtime compatibility check from query to here?
    const runtimes = editorStore.graphManagerState.graph.runtimes.filter((rt) =>
      rt.runtimeValue.mappings.map((m) => m.value).includes(mapping),
    );
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
                <ExclamationTriangleIcon />
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
        pureSingleExecution_setRuntime(
          selectedExecution,
          val.value,
          editorStore.changeDetectionState.observerContext,
        );
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
            pureSingleExecution_setMapping(
              selectedExecution,
              element,
              editorStore.changeDetectionState.observerContext,
            );
            if (selectedTestState instanceof LegacySingleExecutionTestState) {
              flowResult(selectedTestState.generateTestData()).catch(
                applicationStore.alertUnhandledError,
              );
            }
            executionState.autoSelectRuntimeOnMappingChange(element);
          } else if (
            element instanceof PackageableRuntime &&
            element.runtimeValue.mappings.map((m) => m.value).includes(mapping)
          ) {
            pureSingleExecution_setRuntime(
              selectedExecution,
              new RuntimePointer(
                PackageableElementExplicitReference.create(element),
              ),
              editorStore.changeDetectionState.observerContext,
            );
          }
        }
      },
      [
        applicationStore.alertUnhandledError,
        editorStore.changeDetectionState.observerContext,
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
              <PURE_MappingIcon />
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
              <LongArrowRightIcon />
            </button>
          </div>
          <div className="service-execution-editor__configuration__item">
            <div className="btn--sm service-execution-editor__configuration__item__label">
              <PURE_RuntimeIcon />
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
                <CogIcon />
              </button>
            )}
            {isRuntimePointer && (
              <button
                className="btn--sm btn--dark service-execution-editor__configuration__item__btn"
                onClick={visitRuntime}
                tabIndex={-1}
                title={'See runtime'}
              >
                <LongArrowRightIcon />
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
    selectedTestState: LegacySingleExecutionTestState | ServiceTestSuiteState;
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
            {selectedTab === SERVICE_EXECUTION_TAB.EXECUTION_CONTEXT && (
              <PureSingleExecutionConfigurationEditor
                executionState={executionState}
                selectedExecution={selectedExecution}
                selectedTestState={selectedTestState}
              />
            )}
            {selectedTab === SERVICE_EXECUTION_TAB.TESTS &&
              selectedTestState instanceof LegacySingleExecutionTestState && (
                <ServiceTestEditor
                  executionState={executionState}
                  selectedTestState={selectedTestState}
                />
              )}
            {selectedTab === SERVICE_EXECUTION_TAB.TESTS &&
              selectedTestState instanceof ServiceTestSuiteState && (
                <UnsupportedEditorPanel
                  text={`Can't display this element in form-mode`}
                  isReadOnly={selectedTestState.serviceEditorState.isReadOnly}
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
        <BlankPanelContent>No execution selected</BlankPanelContent>
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
    const applicationStore = useApplicationStore();
    const addKey = (): void =>
      applicationStore.notifyError(
        'Multi key execution currently not supported',
      );

    return (
      <div className="service-execution-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={200} minSize={28}>
            <ServiceExecutionQueryEditor
              executionState={executionState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
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
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel size={250} minSize={50}>
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
                    </ResizablePanel>
                    <ResizablePanelSplitter>
                      <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
                    </ResizablePanelSplitter>
                    <ResizablePanel minSize={300}>
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
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
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
