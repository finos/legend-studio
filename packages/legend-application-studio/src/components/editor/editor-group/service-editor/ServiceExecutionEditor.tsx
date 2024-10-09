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

import { useEffect, useCallback, useState, forwardRef } from 'react';
import { observer } from 'mobx-react-lite';
import { ServiceEditorState } from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';
import {
  type ServiceExecutionContextState,
  SingleServicePureExecutionState,
  ServicePureExecutionState,
  MultiServicePureExecutionState,
  InlineServicePureExecutionState,
} from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceExecutionState.js';
import { EmbeddedRuntimeEditor } from '../RuntimeEditor.js';
import { useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/editor/utils/DnDUtils.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
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
  ContextMenu,
  KeyIcon,
  MenuContent,
  MenuContentItem,
  Dialog,
  InputWithInlineValidation,
  BlankPanelPlaceholder,
  PlusIcon,
  ArrowsJoinIcon,
  ArrowsSplitIcon,
  PanelDropZone,
  Panel,
  PanelContent,
  ModalTitle,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelHeader,
} from '@finos/legend-art';
import { ServiceExecutionQueryEditor } from './ServiceExecutionQueryEditor.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type KeyedExecutionParameter,
  type Runtime,
  Mapping,
  RuntimePointer,
  PackageableRuntime,
  PackageableElementExplicitReference,
  validate_PureExecutionMapping,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { CUSTOM_LABEL } from '../../../../stores/editor/NewElementState.js';

const PureExecutionContextConfigurationEditor = observer(
  (props: {
    pureExecutionState: ServicePureExecutionState;
    executionContextState: ServiceExecutionContextState;
  }) => {
    const { executionContextState, pureExecutionState } = props;
    const executionContext = executionContextState.executionContext;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const serviceState =
      editorStore.tabManagerState.getCurrentEditorState(ServiceEditorState);
    const isReadOnly = serviceState.isReadOnly;
    // mapping
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
        executionContextState.setMapping(val.value);
        pureExecutionState.autoSelectRuntimeOnMappingChange(val.value);
      }
    };
    const visitMapping = (): void =>
      editorStore.graphEditorMode.openElement(mapping);
    // runtime
    const runtime = executionContext.runtime;
    const isRuntimePointer = runtime instanceof RuntimePointer;
    const customRuntimeLabel = (
      <div className="service-execution-editor__configuration__runtime-option--custom">
        <CogIcon />
        <div className="service-execution-editor__configuration__runtime-option--custom__label">
          {CUSTOM_LABEL}
        </div>
      </div>
    );
    // only show custom runtime option when a runtime pointer is currently selected
    let runtimeOptions = !isRuntimePointer
      ? []
      : ([{ label: customRuntimeLabel }] as {
          label: string | React.ReactNode;
          value: Runtime | undefined;
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
      value: Runtime | undefined;
    }): void => {
      if (val.value === undefined) {
        pureExecutionState.useCustomRuntime();
      } else if (val.value !== runtime) {
        executionContextState.setRuntime(val.value);
      }
    };
    const visitRuntime = (): void => {
      if (runtime instanceof RuntimePointer) {
        editorStore.graphEditorMode.openElement(
          runtime.packageableRuntime.value,
        );
      }
    };
    const openRuntimeEditor = (): void =>
      pureExecutionState.openRuntimeEditor();
    // DnD
    const handleMappingOrRuntimeDrop = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (!isReadOnly) {
          if (element instanceof Mapping) {
            executionContextState.setMapping(element);
            pureExecutionState.autoSelectRuntimeOnMappingChange(element);
          } else if (
            element instanceof PackageableRuntime &&
            element.runtimeValue.mappings.map((m) => m.value).includes(mapping)
          ) {
            executionContextState.setRuntime(
              new RuntimePointer(
                PackageableElementExplicitReference.create(element),
              ),
            );
          }
        }
      },
      [isReadOnly, mapping, executionContextState, pureExecutionState],
    );
    const [{ isMappingOrRuntimeDragOver }, dropMappingOrRuntimeRef] = useDrop<
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
    // close runtime editor as we leave service editor
    useEffect(
      () => (): void => pureExecutionState.closeRuntimeEditor(),
      [executionContextState, pureExecutionState],
    );

    return (
      <PanelContent>
        <PanelDropZone
          dropTargetConnector={dropMappingOrRuntimeRef}
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
              {!isRuntimePointer && (
                <button
                  className="btn--sm btn--dark service-execution-editor__configuration__item__btn"
                  disabled={Boolean(isReadOnly || isMappingEmpty)}
                  onClick={openRuntimeEditor}
                  tabIndex={-1}
                  title={
                    isReadOnly ? 'See runtime' : 'Configure custom runtime'
                  }
                >
                  <CogIcon />
                </button>
              )}
              {isRuntimePointer && (
                <button
                  className="btn--sm btn--dark service-execution-editor__configuration__item__btn"
                  onClick={visitRuntime}
                  tabIndex={-1}
                  title="See runtime"
                >
                  <LongArrowRightIcon />
                </button>
              )}
              <EmbeddedRuntimeEditor
                runtimeEditorState={pureExecutionState.runtimeEditorState}
                isReadOnly={serviceState.isReadOnly}
                onClose={(): void => pureExecutionState.closeRuntimeEditor()}
              />
            </div>
          </div>
        </PanelDropZone>
      </PanelContent>
    );
  },
);

export const ChangeExecutionModal = observer(
  (props: {
    executionState: ServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const { executionState, isReadOnly } = props;
    const applicationStore = executionState.editorStore.applicationStore;
    const closeModal = (): void => executionState.setShowChangeExecModal(false);
    const isChangingToMulti =
      executionState instanceof SingleServicePureExecutionState;
    const renderChangeExecution = (): React.ReactNode => {
      if (executionState instanceof SingleServicePureExecutionState) {
        const keyValue = executionState.multiExecutionKey;
        const validationMessage =
          keyValue === '' ? `Key value can't be empty` : undefined;

        const onChange: React.ChangeEventHandler<HTMLInputElement> = (
          event,
        ) => {
          executionState.setMultiExecutionKey(event.target.value);
        };
        return (
          <InputWithInlineValidation
            className="service-execution-editor__input input-group__input"
            spellCheck={false}
            value={keyValue}
            onChange={onChange}
            placeholder="Multi Execution Key Name"
            error={validationMessage}
          />
        );
      } else if (executionState instanceof MultiServicePureExecutionState) {
        const currentOption = executionState.singleExecutionKey
          ? {
              value: executionState.singleExecutionKey,
              label: executionState.singleExecutionKey.key,
            }
          : undefined;
        const multiOptions = executionState.keyedExecutionParameters.map(
          (keyExecutionParameter) => ({
            value: keyExecutionParameter,
            label: keyExecutionParameter.key,
          }),
        );
        const _onChange = (
          val: { label: string; value: KeyedExecutionParameter } | null,
        ): void => {
          if (val === null) {
            executionState.setSingleExecutionKey(undefined);
          } else if (val.value !== currentOption?.value) {
            executionState.setSingleExecutionKey(val.value);
          }
        };
        return (
          <CustomSelectorInput
            className="panel__content__form__section__dropdown"
            options={multiOptions}
            onChange={_onChange}
            value={currentOption}
            escapeClearsValue={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            disabled={isReadOnly}
          />
        );
      }
      return null;
    };
    return (
      <Dialog
        open={executionState.showChangeExecModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            executionState.changeExecution();
            closeModal();
          }}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">
            {`Change to ${isChangingToMulti ? 'multi' : 'single'} execution`}
          </div>
          <div className="service-execution-editor__change__modal">
            {renderChangeExecution()}
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={
                isReadOnly || executionState.isChangeExecutionDisabled()
              }
            >
              Change
            </button>
          </div>
        </form>
      </Dialog>
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
        <Panel>
          <div className="panel__content service-editor__content">
            <PureExecutionContextConfigurationEditor
              pureExecutionState={singleExecutionState}
              executionContextState={
                singleExecutionState.selectedExecutionContextState
              }
            />
          </div>
        </Panel>
      </div>
    );
  },
);

const KeyExecutionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      multiExecutionState: MultiServicePureExecutionState;
      keyExecutionParameter: KeyedExecutionParameter;
      isReadOnly: boolean;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { multiExecutionState, keyExecutionParameter } = props;
    const rename = (): void => {
      multiExecutionState.setRenameKey(keyExecutionParameter);
    };
    const remove = (): void => {
      multiExecutionState.deleteKeyExecutionParameter(keyExecutionParameter);
    };
    const add = (): void => {
      multiExecutionState.setNewKeyParameterModal(true);
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

const KeyExecutionItem = observer(
  (props: {
    multiExecutionState: MultiServicePureExecutionState;
    keyExecutionParameter: KeyedExecutionParameter;
    isReadOnly: boolean;
  }) => {
    const { multiExecutionState, keyExecutionParameter, isReadOnly } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isActive =
      multiExecutionState.selectedExecutionContextState?.executionContext ===
      keyExecutionParameter;
    const openKeyedExecution = (): void =>
      multiExecutionState.changeKeyedExecutionParameter(keyExecutionParameter);
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
          <KeyExecutionContextMenu
            multiExecutionState={multiExecutionState}
            keyExecutionParameter={keyExecutionParameter}
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
          {keyExecutionParameter.key}
        </button>
      </ContextMenu>
    );
  },
);

export const NewExecutionParameterModal = observer(
  (props: {
    executionState: MultiServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const [keyValue, setKeyValue] = useState('');
    const { executionState, isReadOnly } = props;
    const validationMessage =
      keyValue === ''
        ? `Execution context key can't be empty`
        : executionState.execution.executionParameters?.find(
              (e) => e.key === keyValue,
            )
          ? 'Execution context key already exists'
          : undefined;

    const closeModal = (): void =>
      executionState.setNewKeyParameterModal(false);
    const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      setKeyValue(event.target.value);
    };
    return (
      <Dialog
        open={executionState.newKeyParameterModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            executionState.addExecutionParameter(keyValue);
            setKeyValue('');
            closeModal();
          }}
          className="modal modal--dark search-modal"
        >
          <ModalTitle title="New Execution Context" />
          <div className="service-execution-editor__change__modal">
            <InputWithInlineValidation
              className="service-execution-editor__input input-group__input"
              spellCheck={false}
              value={keyValue}
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

const MultiPureExecutionEditor = observer(
  (props: { multiExecutionState: MultiServicePureExecutionState }) => {
    const { multiExecutionState } = props;
    const multiExecution = multiExecutionState.execution;
    const key = multiExecution.executionKey;
    const addExecutionKey = (): void => {
      multiExecutionState.setNewKeyParameterModal(true);
    };
    const editReviewTitle: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      multiExecutionState.setExecutionKey(event.target.value);
    };
    return (
      <div className="service-execution-editor__execution">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel size={300} minSize={200}>
            <div className="service-multi-execution-editor__header">
              <div className="service-multi-execution-editor__header__content">
                <div className="btn--sm service-multi-execution-editor__header__content__label">
                  <KeyIcon />
                </div>
                <input
                  className="service-multi-execution-editor__header__content__input input--dark"
                  spellCheck={false}
                  value={key}
                  onChange={editReviewTitle}
                  placeholder="Execution context key"
                />
              </div>
            </div>
            <div className="service-multi-execution-editor__panel">
              <PanelHeader>
                <div className="panel__header__title">
                  <div className="panel__header__title__content">
                    Execution Contexts
                  </div>
                </div>
                <PanelHeaderActions>
                  <PanelHeaderActionItem
                    disabled={multiExecutionState.serviceEditorState.isReadOnly}
                    onClick={addExecutionKey}
                    title="Add an execution context"
                  >
                    <PlusIcon />
                  </PanelHeaderActionItem>
                </PanelHeaderActions>
              </PanelHeader>

              {multiExecutionState.keyedExecutionParameters.map(
                (executionParameter) => (
                  <KeyExecutionItem
                    key={executionParameter.key}
                    multiExecutionState={multiExecutionState}
                    keyExecutionParameter={executionParameter}
                    isReadOnly={
                      multiExecutionState.serviceEditorState.isReadOnly
                    }
                  />
                ),
              )}
              {!multiExecutionState.keyedExecutionParameters.length && (
                <BlankPanelPlaceholder
                  text="Add an execution context"
                  onClick={addExecutionKey}
                  clickActionType="add"
                  tooltipText="Click to add an execution context"
                />
              )}
            </div>
            {multiExecutionState.newKeyParameterModal && (
              <NewExecutionParameterModal
                executionState={multiExecutionState}
                isReadOnly={multiExecutionState.serviceEditorState.isReadOnly}
              />
            )}
            {multiExecutionState.renameKey && (
              <RenameModal
                val={multiExecutionState.renameKey.key}
                isReadOnly={multiExecutionState.serviceEditorState.isReadOnly}
                showModal={true}
                closeModal={(): void =>
                  multiExecutionState.setRenameKey(undefined)
                }
                setValue={(val: string): void =>
                  multiExecutionState.changeKeyValue(
                    guaranteeNonNullable(multiExecutionState.renameKey),
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
            {multiExecutionState.selectedExecutionContextState ? (
              <PureExecutionContextConfigurationEditor
                pureExecutionState={multiExecutionState}
                executionContextState={
                  multiExecutionState.selectedExecutionContextState
                }
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
  },
);

const ServicePureExecutionEditor = observer(
  (props: {
    servicePureExecutionState: ServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const { servicePureExecutionState, isReadOnly } = props;
    const serviceState = servicePureExecutionState.serviceEditorState;
    const isMultiExecution =
      servicePureExecutionState instanceof MultiServicePureExecutionState;
    const showChangeExecutionModal = (): void => {
      if (servicePureExecutionState instanceof MultiServicePureExecutionState) {
        servicePureExecutionState.setSingleExecutionKey(
          servicePureExecutionState.keyedExecutionParameters[0],
        );
      }
      servicePureExecutionState.setShowChangeExecModal(true);
    };

    const renderExecutionEditor = (): React.ReactNode => {
      if (
        servicePureExecutionState instanceof SingleServicePureExecutionState
      ) {
        return (
          <PureSingleExecutionEditor
            singleExecutionState={servicePureExecutionState}
          />
        );
      } else if (
        servicePureExecutionState instanceof MultiServicePureExecutionState
      ) {
        return (
          <MultiPureExecutionEditor
            multiExecutionState={servicePureExecutionState}
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
    if (servicePureExecutionState instanceof InlineServicePureExecutionState) {
      return (
        <div className="service-execution-editor">
          <ServiceExecutionQueryEditor
            executionState={servicePureExecutionState}
            isReadOnly={isReadOnly}
          />
        </div>
      );
    } else {
      return (
        <div className="service-execution-editor">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={500} minSize={28}>
              <ServiceExecutionQueryEditor
                executionState={servicePureExecutionState}
                isReadOnly={isReadOnly}
              />
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <div className="service-execution-editor__content">
                <Panel>
                  <div className="panel__header">
                    <div className="panel__header__title">
                      <div className="panel__header__title__label service-editor__execution__label--test">
                        context
                      </div>
                    </div>
                    <div className="service-multi-execution-editor__actions">
                      {(servicePureExecutionState instanceof
                        SingleServicePureExecutionState ||
                        servicePureExecutionState instanceof
                          MultiServicePureExecutionState) && (
                        <button
                          className="service-multi-execution-editor__action"
                          tabIndex={-1}
                          onClick={showChangeExecutionModal}
                          title={`Switch to ${
                            servicePureExecutionState instanceof
                            SingleServicePureExecutionState
                              ? 'multi execution'
                              : 'single execution'
                          }`}
                        >
                          {isMultiExecution ? (
                            <ArrowsJoinIcon />
                          ) : (
                            <ArrowsSplitIcon />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="panel__content service-execution-editor__configuration__content">
                    {renderExecutionEditor()}
                    {servicePureExecutionState.showChangeExecModal && (
                      <ChangeExecutionModal
                        executionState={servicePureExecutionState}
                        isReadOnly={
                          servicePureExecutionState.serviceEditorState
                            .isReadOnly
                        }
                      />
                    )}
                  </div>
                </Panel>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      );
    }
  },
);

export const ServiceExecutionEditor = observer(() => {
  const editorStore = useEditorStore();
  const serviceState =
    editorStore.tabManagerState.getCurrentEditorState(ServiceEditorState);
  const executionState = serviceState.executionState;
  const isReadOnly = serviceState.isReadOnly;
  if (executionState instanceof ServicePureExecutionState) {
    return (
      <ServicePureExecutionEditor
        servicePureExecutionState={executionState}
        isReadOnly={isReadOnly}
      />
    );
  }
  return (
    <UnsupportedEditorPanel
      text="Can't display this service execution in form-mode"
      isReadOnly={serviceState.isReadOnly}
    />
  );
});
