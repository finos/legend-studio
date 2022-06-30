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
  SingleServicePureExecutionState,
  ServicePureExecutionState,
  MultiServicePureExecutionState,
} from '../../../../stores/editor-state/element-editor-state/service/ServiceExecutionState.js';
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
  CustomSelectorInput,
} from '@finos/legend-art';
import { ServiceExecutionQueryEditor } from '../../../editor/edit-panel/service-editor/ServiceExecutionQueryEditor.js';
import type { PackageableElementOption } from '../../../../stores/shared/PackageableElementOptionUtil.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type Runtime,
  Mapping,
  RuntimePointer,
  PackageableRuntime,
  PackageableElementExplicitReference,
  validate_PureExecutionMapping,
} from '@finos/legend-graph';
import {
  pureSingleExecution_setMapping,
  pureSingleExecution_setRuntime,
} from '../../../../stores/graphModifier/DSLService_GraphModifierHelper.js';

const PureSingleExecutionConfigurationEditor = observer(
  (props: { singleExecutionState: SingleServicePureExecutionState }) => {
    const { singleExecutionState } = props;
    const selectedExecution = singleExecutionState.execution;
    const editorStore = useEditorStore();
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
        singleExecutionState.autoSelectRuntimeOnMappingChange(val.value);
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
        singleExecutionState.useCustomRuntime();
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
    const openRuntimeEditor = (): void =>
      singleExecutionState.openRuntimeEditor();
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
            singleExecutionState.autoSelectRuntimeOnMappingChange(element);
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
        editorStore.changeDetectionState.observerContext,
        singleExecutionState,
        isReadOnly,
        mapping,
        selectedExecution,
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
      () => (): void => singleExecutionState.closeRuntimeEditor(),
      [singleExecutionState],
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
              runtimeEditorState={singleExecutionState.runtimeEditorState}
              isReadOnly={serviceState.isReadOnly}
              onClose={(): void => singleExecutionState.closeRuntimeEditor()}
            />
          </div>
        </div>
      </div>
    );
  },
);

const PureSingleExecutionEditor = observer(
  (props: { singleExecutionState: SingleServicePureExecutionState }) => {
    const { singleExecutionState } = props;
    // close runtime editor as we leave service editor
    useEffect(
      () => (): void => singleExecutionState.closeRuntimeEditor(),
      [singleExecutionState],
    );

    return (
      <div className="service-execution-editor__execution">
        <div className="panel">
          <div className="panel__content service-editor__content">
            <PureSingleExecutionConfigurationEditor
              singleExecutionState={singleExecutionState}
            />
          </div>
        </div>
      </div>
    );
  },
);

const ServicePureExecutionEditor = observer(
  (props: {
    singleExecutionState: ServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const { singleExecutionState, isReadOnly } = props;
    const serviceState = singleExecutionState.serviceEditorState;
    const renderExecutionEditor = (): React.ReactNode => {
      if (singleExecutionState instanceof SingleServicePureExecutionState) {
        return (
          <PureSingleExecutionEditor
            singleExecutionState={singleExecutionState}
          />
        );
      } else if (
        singleExecutionState instanceof MultiServicePureExecutionState
      ) {
        return (
          <UnsupportedEditorPanel
            text="Can't display multi execution in form-mode"
            isReadOnly={serviceState.isReadOnly}
          />
        );
      }
      return (
        <UnsupportedEditorPanel
          text="Can't display this execution in form-mode"
          isReadOnly={serviceState.isReadOnly}
        />
      );
    };
    return (
      <div className="service-execution-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={500} minSize={28}>
            <ServiceExecutionQueryEditor
              executionState={singleExecutionState}
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
                      context
                    </div>
                  </div>
                </div>
                <div className="panel__content service-execution-editor__configuration__content">
                  {renderExecutionEditor()}
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
  if (executionState instanceof ServicePureExecutionState) {
    return (
      <ServicePureExecutionEditor
        singleExecutionState={executionState}
        isReadOnly={isReadOnly}
      />
    );
  }
  return (
    <UnsupportedEditorPanel
      text="Can't display thie service execution in form-mode"
      isReadOnly={serviceState.isReadOnly}
    />
  );
});
