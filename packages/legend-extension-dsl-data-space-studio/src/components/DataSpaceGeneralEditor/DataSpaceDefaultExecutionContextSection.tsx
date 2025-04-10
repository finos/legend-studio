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
  clsx,
  CustomSelectorInput,
  ErrorIcon,
  ExclamationTriangleIcon,
  LongArrowRightIcon,
  PanelDropZone,
  PanelFormSection,
  PencilIcon,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  XIcon,
} from '@finos/legend-art';
import type { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import {
  dataSpace_setDefaultExecutionContext,
  dataSpace_setExecutionContextDefaultRuntime,
  dataSpace_setExecutionContextMapping,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  useEditorStore,
  type UMLEditorElementDropTarget,
} from '@finos/legend-application-studio';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import {
  validate_PureExecutionMapping,
  Mapping,
  PackageableElementExplicitReference,
  PackageableRuntime,
} from '@finos/legend-graph';
import { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  RenameModal,
  NewExecutionContextModal,
} from '../DataSpaceExecutionContextEditor.js';
import type { PropsValue } from 'react-select';

export const DataSpaceDefaultExecutionContextSection = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;
  const executionContext = dataSpace.defaultExecutionContext;

  const executionContextState = dataSpaceState.executionContextState;

  // Mapping
  // TODO: this is not generic error handling, as there could be other problems
  // with mapping, we need to genericize this
  const isMappingEmpty = validate_PureExecutionMapping(
    executionContext.mapping.value,
  );
  const mapping = executionContext.mapping.value;
  const mappingOptions =
    editorStore.graphManagerState.usableMappings.map(buildElementOption);
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
  } as PackageableElementOption<Mapping>;
  const onMappingSelectionChange = (
    val: PackageableElementOption<Mapping>,
  ): void => {
    if (val.value !== mapping) {
      dataSpace_setExecutionContextMapping(
        executionContext,
        PackageableElementExplicitReference.create(val.value),
      );
      executionContextState.autoSelectRuntimeOnMappingChange(val.value);
    }
  };
  const visitMapping = (): void =>
    editorStore.graphEditorMode.openElement(mapping);

  // Runtime
  const defaultRuntime = executionContext.defaultRuntime;
  // NOTE: for now, only include runtime associated with the mapping
  // TODO?: Should we bring the runtime compatibility check from query to here?
  const runtimes = editorStore.graphManagerState.graph.runtimes.filter((rt) =>
    rt.runtimeValue.mappings.map((m) => m.value).includes(mapping),
  );
  const runtimeOptions = runtimes.map((rt) => ({
    label: rt.path,
    value: PackageableElementExplicitReference.create(rt),
  }));
  const runtimePointerWarning = !runtimes.includes(defaultRuntime.value) // if the runtime does not belong to the chosen mapping
    ? `runtime is not associated with specified mapping '${mapping.path}'`
    : undefined;
  const selectedRuntimeOption = {
    value: defaultRuntime,
    label: (
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
          {defaultRuntime.value.path}
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
    ),
  } as unknown as PropsValue<{
    label: string;
    value: PackageableElementExplicitReference<PackageableRuntime>;
  }>;
  const onRuntimeSelectionChange = (val: {
    label: string | React.ReactNode;
    value: PackageableElementExplicitReference<PackageableRuntime> | undefined;
  }): void => {
    if (val.value?.value !== defaultRuntime.value && val.value !== undefined) {
      dataSpace_setExecutionContextDefaultRuntime(executionContext, val.value);
    }
  };
  const visitRuntime = (): void => {
    editorStore.graphEditorMode.openElement(defaultRuntime.value);
  };

  // DnD
  const handleMappingOrRuntimeDrop = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      const element = item.data.packageableElement;
      if (!dataSpaceState.isReadOnly) {
        if (element instanceof Mapping) {
          dataSpace_setExecutionContextMapping(
            executionContext,
            PackageableElementExplicitReference.create(element),
          );
          executionContextState.autoSelectRuntimeOnMappingChange(element);
        } else if (
          element instanceof PackageableRuntime &&
          element.runtimeValue.mappings.map((m) => m.value).includes(mapping)
        ) {
          dataSpace_setExecutionContextDefaultRuntime(
            executionContext,
            PackageableElementExplicitReference.create(element),
          );
        }
      }
    },
    [
      dataSpaceState.isReadOnly,
      mapping,
      executionContextState,
      executionContext,
    ],
  );
  const [{ isMappingOrRuntimeDragOver }, dropConnector] = useDrop<
    ElementDragSource,
    void,
    { isMappingOrRuntimeDragOver: boolean }
  >(
    () => ({
      accept: [
        CORE_DND_TYPE.PROJECT_EXPLORER_MAPPING,
        CORE_DND_TYPE.PROJECT_EXPLORER_RUNTIME,
      ],
      drop: (item) => handleMappingOrRuntimeDrop(item),
      collect: (monitor) => ({
        isMappingOrRuntimeDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleMappingOrRuntimeDrop],
  );

  //multiple execution contexts
  const addExecutionKey = (): void => {
    executionContextState.setNewExecutionContextModal(true);
  };
  type ExecutionContextOption = {
    label: string;
    value: DataSpaceExecutionContext;
  };
  const buildExecutionContextOption = (
    context: DataSpaceExecutionContext,
  ): ExecutionContextOption => ({
    label: context.name,
    value: context,
  });
  const executionContextOptions = dataSpace.executionContexts.map(
    buildExecutionContextOption,
  );
  const onExecutionContextChange = (option: ExecutionContextOption) => {
    if (option.value !== executionContext) {
      dataSpace_setDefaultExecutionContext(dataSpace, option.value);
      executionContextState.setSelectedExecutionContext(option.value);
    }
  };
  const activeExecutionContext = buildExecutionContextOption(executionContext);
  const deleteExecutionContext = (): void => {
    executionContextState.removeExecutionContext(executionContext);
    if (
      dataSpace.executionContexts.length > 0 &&
      dataSpace.executionContexts[0]
    ) {
      dataSpace_setDefaultExecutionContext(
        dataSpace,
        dataSpace.executionContexts[0],
      );
    }
  };

  return (
    <PanelFormSection>
      <div className="panel__content__form__section__header__label">
        Execution Context
      </div>
      <div className="panel__content__form__section__header__prompt">
        Define the mapping and runtime for this Data Product.
      </div>
      {dataSpace.executionContexts.length > 1 && (
        <div className="service-execution-editor__configuration__item">
          <CustomSelectorInput
            className="panel__content__form__section__dropdown service-execution-editor__configuration__item__dropdown"
            disabled={dataSpaceState.isReadOnly}
            options={executionContextOptions}
            onChange={onExecutionContextChange}
            value={activeExecutionContext}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
          <button
            className="btn--dark btn--sm service-execution-editor__configuration__item__btn"
            onClick={() =>
              executionContextState.setExecutionContextToRename(
                activeExecutionContext.value,
              )
            }
            tabIndex={-1}
            title="Edit Execution Context"
          >
            <PencilIcon />
          </button>
          <button
            className="btn--dark btn--sm service-execution-editor__configuration__item__btn"
            onClick={deleteExecutionContext}
            tabIndex={-1}
            title="Delete Execution Context"
          >
            <XIcon />
          </button>
        </div>
      )}
      {executionContextState.newExecutionContextModal && (
        <NewExecutionContextModal
          executionState={executionContextState}
          isReadOnly={dataSpaceState.isReadOnly}
        />
      )}
      {executionContextState.executionContextToRename && (
        <RenameModal
          val={executionContextState.executionContextToRename.name}
          isReadOnly={dataSpaceState.isReadOnly}
          showModal={true}
          closeModal={(): void =>
            executionContextState.setExecutionContextToRename(undefined)
          }
          setValue={(val: string): void =>
            executionContextState.renameExecutionContext(
              guaranteeNonNullable(
                executionContextState.executionContextToRename,
              ),
              val,
            )
          }
          executionContext={executionContextState.executionContextToRename}
        />
      )}

      <PanelDropZone
        dropTargetConnector={dropConnector}
        isDragOver={isMappingOrRuntimeDragOver && !dataSpaceState.isReadOnly}
      >
        <div className="service-execution-editor__configuration__items">
          <div className="service-execution-editor__configuration__item">
            <div className="btn--sm service-execution-editor__configuration__item__label">
              <PURE_MappingIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown service-execution-editor__configuration__item__dropdown"
              disabled={dataSpaceState.isReadOnly}
              options={mappingOptions}
              onChange={onMappingSelectionChange}
              value={selectedMappingOption}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              hasError={Boolean(isMappingEmpty)}
            />
            <button
              className="btn--dark btn--sm service-execution-editor__configuration__item__btn"
              onClick={visitMapping}
              tabIndex={-1}
              title="See mapping"
              disabled={Boolean(isMappingEmpty)}
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
              disabled={dataSpaceState.isReadOnly}
              options={runtimeOptions}
              onChange={onRuntimeSelectionChange}
              value={selectedRuntimeOption}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
            <button
              className="btn--sm btn--dark service-execution-editor__configuration__item__btn"
              onClick={visitRuntime}
              tabIndex={-1}
              title="See runtime"
              disabled={Boolean(runtimePointerWarning)}
            >
              <LongArrowRightIcon />
            </button>
          </div>
        </div>
      </PanelDropZone>
      <div className="panel__content__form__section__list__new-item__add">
        <button
          className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
          // disabled={isReadOnly}
          onClick={addExecutionKey}
          tabIndex={-1}
        >
          Add Value
        </button>
      </div>
    </PanelFormSection>
  );
});
