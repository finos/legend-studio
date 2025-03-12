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
  type ElementDragSource,
  type UMLEditorElementDropTarget,
  CORE_DND_TYPE,
  useEditorStore,
} from '@finos/legend-application-studio';
import { observer } from 'mobx-react-lite';
import { useDrop } from 'react-dnd';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  BlankPanelPlaceholder,
  clsx,
  ContextMenu,
  CustomSelectorInput,
  Dialog,
  ErrorIcon,
  ExclamationTriangleIcon,
  InputWithInlineValidation,
  LongArrowRightIcon,
  MenuContent,
  MenuContentItem,
  ModalTitle,
  PanelContent,
  PanelDropZone,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PlusIcon,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import {
  DataElementReference,
  Mapping,
  PackageableElementExplicitReference,
  PackageableRuntime,
  validate_PureExecutionMapping,
} from '@finos/legend-graph';
import {
  dataSpace_setExecutionContextDefaultRuntime,
  dataSpace_setExecutionContextMapping,
  dataSpace_setExecutionContextTitle,
  dataSpace_setExecutionContextDescription,
  dataSpace_setExecutionContextTestData,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import type { DataSpaceExecutionContextState } from '../stores/DataSpaceExecutionContextState.js';
import type { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

const DataSpaceExecutionContextConfigurationEditor = observer(
  (props: {
    executionContextState: DataSpaceExecutionContextState;
    executionContext: DataSpaceExecutionContext;
  }) => {
    const { executionContextState, executionContext } = props;
    const isReadOnly = executionContextState.dataSpaceEditorState.isReadOnly;
    const editorStore = executionContextState.editorStore;
    const applicationStore = editorStore.applicationStore;

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
      label: defaultRuntime ? (
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
      ) : (
        'No runtime selected'
      ),
    };
    const onRuntimeSelectionChange = (val: {
      label: string | React.ReactNode;
      value:
        | PackageableElementExplicitReference<PackageableRuntime>
        | undefined;
    }): void => {
      if (
        val.value?.value !== defaultRuntime.value &&
        val.value !== undefined
      ) {
        dataSpace_setExecutionContextDefaultRuntime(
          executionContext,
          val.value,
        );
      }
    };
    const visitRuntime = (): void => {
      editorStore.graphEditorMode.openElement(defaultRuntime.value);
    };

    // DnD
    const handleMappingOrRuntimeDrop = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (!isReadOnly) {
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
      [isReadOnly, mapping, executionContextState, executionContext],
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

    // Data element options for test data selector
    const dataElementOptions = useMemo(() => {
      return editorStore.graphManagerState.graph.dataElements.map(
        (dataElement) => ({
          label: dataElement.path,
          value: dataElement,
        }),
      );
    }, [editorStore.graphManagerState.graph.dataElements]);

    return (
      <PanelContent>
        <PanelDropZone
          dropTargetConnector={dropConnector}
          isDragOver={isMappingOrRuntimeDragOver && !isReadOnly}
        >
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
              >
                <LongArrowRightIcon />
              </button>
            </div>

            {/* Title input */}
            <div className="execution-context-editor__form-section">
              <div className="execution-context-editor__form-section__label">
                Title
              </div>
              <div className="execution-context-editor__form-section__content">
                <input
                  className="execution-context-editor__form-section__content__input panel__content__form__section__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={executionContext.title ?? ''}
                  onChange={(event): void =>
                    dataSpace_setExecutionContextTitle(
                      executionContext,
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            {/* Description input */}
            <div className="execution-context-editor__form-section">
              <div className="execution-context-editor__form-section__label">
                Description
              </div>
              <div className="execution-context-editor__form-section__content">
                <textarea
                  className="execution-context-editor__form-section__content__textarea panel__content__form__section__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={executionContext.description ?? ''}
                  onChange={(event): void =>
                    dataSpace_setExecutionContextDescription(
                      executionContext,
                      event.target.value,
                    )
                  }
                  rows={4}
                />
              </div>
            </div>

            {/* Test Data input */}
            <div className="execution-context-editor__form-section">
              <div className="execution-context-editor__form-section__label">
                Test Data
              </div>
              <div className="execution-context-editor__form-section__content">
                <CustomSelectorInput
                  className="panel__content__form__section__dropdown"
                  disabled={isReadOnly}
                  options={dataElementOptions}
                  onChange={(
                    option: { label: string; value: unknown } | null,
                  ): void => {
                    if (option && option.value) {
                      // Create a reference to the selected data element
                      const dataElementRef =
                        PackageableElementExplicitReference.create(
                          option.value as any,
                        );
                      // Pass the reference to the action method
                      dataSpace_setExecutionContextTestData(
                        executionContext,
                        dataElementRef as any,
                      );
                    } else {
                      dataSpace_setExecutionContextTestData(
                        executionContext,
                        undefined,
                      );
                    }
                  }}
                  value={null} // Temporarily set to null to avoid type errors
                  placeholder="Select test data..."
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
          </div>
        </PanelDropZone>
      </PanelContent>
    );
  },
);

const NewExecutionContextModal = observer(
  (props: {
    executionState: DataSpaceExecutionContextState;
    isReadOnly: boolean;
  }) => {
    const { executionState, isReadOnly } = props;
    const [name, setName] = useState('');
    const validationMessage =
      name === ''
        ? `Execution context name can't be empty`
        : executionState.executionContexts?.find((e) => e.name === name)
          ? 'Execution context name already exists'
          : undefined;

    const closeModal = (): void =>
      executionState.setNewExecutionContextModal(false);
    const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      setName(event.target.value);
    };
    return (
      <Dialog
        open={executionState.newExecutionContextModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            executionState.addExecutionContext(name);
            setName('');
            closeModal();
          }}
          className="modal modal--dark search-modal"
        >
          <ModalTitle title="New Execution Context" />
          <div className="service-execution-editor__change__modal">
            <InputWithInlineValidation
              className="service-execution-editor__input input-group__input"
              spellCheck={false}
              value={name}
              onChange={onChange}
              placeholder="Key execution name"
              error={validationMessage}
            />
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={isReadOnly || Boolean(validationMessage)}
            >
              Add
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const RenameModal = observer(
  (props: {
    val: string;
    isReadOnly: boolean;
    setValue: (val: string) => void;
    showModal: boolean;
    closeModal: () => void;
  }) => {
    const { val, isReadOnly, showModal, closeModal, setValue } = props;
    const [inputValue, setInputValue] = useState(val);
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      setInputValue(event.target.value);
    };
    return (
      <Dialog
        open={showModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setValue(inputValue);
            closeModal();
          }}
          className="modal modal--dark search-modal"
        >
          <ModalTitle title="Rename" />
          <input
            className="panel__content__form__section__input"
            spellCheck={false}
            disabled={isReadOnly}
            value={inputValue}
            onChange={changeValue}
          />
          <div className="search-modal__actions">
            <button className="btn btn--dark" disabled={isReadOnly}>
              Rename
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const ExecutionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      dataSpaceExecutionContextState: DataSpaceExecutionContextState;
      dataSpaceExecutionContext: DataSpaceExecutionContext;
      isReadOnly: boolean;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { dataSpaceExecutionContextState, dataSpaceExecutionContext } = props;
    const rename = (): void => {
      dataSpaceExecutionContextState.setExecutionContextToRename(
        dataSpaceExecutionContext,
      );
    };
    const remove = (): void => {
      dataSpaceExecutionContextState.removeExecutionContext(
        dataSpaceExecutionContext,
      );
    };
    const add = (): void => {
      dataSpaceExecutionContextState.setNewExecutionContextModal(true);
    };
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={remove}>Delete</MenuContentItem>
        <MenuContentItem onClick={add}>Create a new key</MenuContentItem>
      </MenuContent>
    );
  }),
);

const ExecutionContextItem = observer(
  (props: {
    dataSpaceExecutionContextState: DataSpaceExecutionContextState;
    dataSpaceExecutionContext: DataSpaceExecutionContext;
    isReadOnly: boolean;
  }) => {
    const {
      dataSpaceExecutionContextState,
      dataSpaceExecutionContext,
      isReadOnly,
    } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isActive =
      dataSpaceExecutionContextState.selectedExecutionContext ===
      dataSpaceExecutionContext;

    const openKeyedExecution = (): void =>
      dataSpaceExecutionContextState.setSelectedExecutionContext(
        dataSpaceExecutionContext,
      );
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    return (
      <ContextMenu
        className={clsx(
          'service-multi-execution-editor__item',
          {
            'service-multi-execution-editor__item--selected-from-context-menu':
              !isActive && isSelectedFromContextMenu,
          },
          { 'service-multi-execution-editor__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <ExecutionContextMenu
            dataSpaceExecutionContextState={dataSpaceExecutionContextState}
            dataSpaceExecutionContext={dataSpaceExecutionContext}
            isReadOnly={isReadOnly}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className={clsx('service-multi-execution-editor__item__label')}
          onClick={openKeyedExecution}
          tabIndex={-1}
        >
          {dataSpaceExecutionContext.name}
        </button>
      </ContextMenu>
    );
  },
);

export const DataSpaceExecutionContextEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const executionContextState = dataSpaceState.executionContextState;

  const addExecutionKey = (): void => {
    executionContextState.setNewExecutionContextModal(true);
  };

  return (
    <div className="service-execution-editor__execution">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel size={300} minSize={200}>
          <div className="service-multi-execution-editor__panel">
            <PanelHeader>
              <div className="panel__header__title">
                <div className="panel__header__title__content">
                  Execution Contexts
                </div>
              </div>
              <PanelHeaderActions>
                <PanelHeaderActionItem
                  disabled={dataSpaceState.isReadOnly}
                  onClick={addExecutionKey}
                  title="Add an execution context"
                >
                  <PlusIcon />
                </PanelHeaderActionItem>
              </PanelHeaderActions>
            </PanelHeader>

            {executionContextState.executionContexts.map((executionContext) => (
              <ExecutionContextItem
                key={executionContext.name}
                dataSpaceExecutionContextState={executionContextState}
                dataSpaceExecutionContext={executionContext}
                isReadOnly={dataSpaceState.isReadOnly}
              />
            ))}
            {!executionContextState.executionContexts.length && (
              <BlankPanelPlaceholder
                text="Add an execution context"
                onClick={addExecutionKey}
                clickActionType="add"
                tooltipText="Click to add an execution context"
              />
            )}
          </div>
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
            />
          )}
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel minSize={56}>
          {executionContextState.selectedExecutionContext ? (
            <DataSpaceExecutionContextConfigurationEditor
              executionContextState={executionContextState}
              executionContext={executionContextState.selectedExecutionContext}
            />
          ) : (
            <BlankPanelPlaceholder
              text="Add an execution context"
              onClick={addExecutionKey}
              clickActionType="add"
              tooltipText="Click to add an execution context"
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
});
