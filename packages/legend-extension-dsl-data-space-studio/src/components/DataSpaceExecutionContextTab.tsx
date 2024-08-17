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

import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  ContextMenu,
  CustomSelectorInput,
<<<<<<< HEAD
  MenuContent,
  MenuContentItem,
=======
  Panel,
  PanelContent,
>>>>>>> executionContext is finished
  PanelFormListItems,
  PanelFormTextField,
<<<<<<< HEAD
=======
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
>>>>>>> styling WIP, form created
  PlusIcon,
} from '@finos/legend-art';
import {
  set_executionContextDescription,
  set_executionContextName,
  set_executionContextTitle,
  set_mapping,
  set_runtime,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import type { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type Mapping,
  type PackageableRuntime,
} from '@finos/legend-graph';
<<<<<<< HEAD
=======
import { useApplicationStore } from '@finos/legend-application';
>>>>>>> styling WIP, form created

interface ExecutionContextTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
<<<<<<< HEAD
  isModalOpen: boolean;
  newExecutionContextName: string;
  setNewExecutionContextName: (name: string) => void;
  openModal: () => void;
  closeModal: () => void;
  addExecutionContext: (
    name: string,
    mapping: PackageableElementReference<Mapping>,
    defaultRuntime: PackageableElementReference<PackageableRuntime>,
  ) => void;
  selectedMapping: PackageableElementReference<Mapping> | null;
  setSelectedMapping: (
    mapping: PackageableElementReference<Mapping> | null,
  ) => void;
  selectedRuntime: PackageableElementReference<PackageableRuntime> | null;
  setSelectedRuntime: (
    runtime: PackageableElementReference<PackageableRuntime> | null,
  ) => void;
}
interface MappingOption {
  value: PackageableElementReference<Mapping>;
  label: string;
}
interface RuntimeOption {
  value: PackageableElementReference<PackageableRuntime>;
  label: string;
}

const ExecutionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      add: () => void;
    }
  >(function ExecutionContextMenu(props, ref) {
    const { add } = props;
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={add}>Add Execution Context</MenuContentItem>
      </MenuContent>
=======
}
interface ExecutionContextItemProps {
  executionContext: DataSpaceExecutionContext;
  dataSpaceEditorState: DataSpaceEditorState;
  idx: number;
}

const ExecutionContextItem: React.FC<ExecutionContextItemProps> = observer(
  (props) => {
    const { executionContext, dataSpaceEditorState, idx } = props;
    const applicationStore = useApplicationStore();

    const isActive =
      dataSpaceEditorState.selectedExecutionContext === executionContext;

    const openContext = (): void => {
      dataSpaceEditorState.setSelectedExecutionContext(executionContext);
    };

    const deleteContext = (): void => {
      const index = dataSpaceEditorState.dataSpace.executionContexts.findIndex(
        (ctx) => ctx === executionContext,
      );
      if (index > -1) {
        dataSpaceEditorState.dataSpace.executionContexts.splice(index, 1);

        if (
          isActive ||
          dataSpaceEditorState.dataSpace.executionContexts.length === 0
        ) {
          dataSpaceEditorState.setSelectedExecutionContext(null);
        }
      }
    };

    return (
      <div
        className={clsx('execution-context-item', {
          'execution-context-item--active': isActive,
        })}
        onClick={openContext}
      >
        <button
          className={clsx('execution-context-item__label')}
          onClick={openContext}
          tabIndex={-1}
        >
          <div className="execution-context-item__label__text">
            {executionContext.name || `ExecutionContext ${idx + 1}`}
          </div>
        </button>
        <div className="execution-context-item__actions">
          <button
            className="execution-context-item__action execution-context-delete-btn"
            onClick={deleteContext}
            tabIndex={-1}
            title={`Delete ${executionContext.name || `ExecutionContext ${idx + 1}`}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
>>>>>>> executionContext is finished
    );
  }),
);

export const DataSpaceExecutionContextTab: React.FC<ExecutionContextTabProps> =
<<<<<<< HEAD
  observer(
    ({
      dataSpaceEditorState,
      isModalOpen,
      newExecutionContextName,
      setNewExecutionContextName,
      openModal,
      closeModal,
      addExecutionContext,
      selectedMapping,
      setSelectedMapping,
      selectedRuntime,
      setSelectedRuntime,
    }) => {
      const executionContext = dataSpaceEditorState.selectedExecutionContext;
      const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
        useState(false);

      const handleTitleChange = (value: string | undefined): void => {
        if (executionContext) {
          set_executionContextTitle(executionContext, value);
          dataSpaceEditorState.setSelectedExecutionContext(executionContext);
        } else {
          console.error('Execution context is undefined.');
        }
      };
=======
  observer(({ dataSpaceEditorState }) => {
    const { selectedExecutionContext } = dataSpaceEditorState;
>>>>>>> executionContext is finished

    const handleTitleChange = (value: string | undefined): void => {
      if (selectedExecutionContext) {
        set_executionContextTitle(selectedExecutionContext, value);
        dataSpaceEditorState.setSelectedExecutionContext(
          selectedExecutionContext,
        );
      } else {
        return;
      }
    };

    const handleDescriptionChange = (value: string | undefined): void => {
      if (selectedExecutionContext) {
        set_executionContextDescription(selectedExecutionContext, value ?? '');
        dataSpaceEditorState.setSelectedExecutionContext(
          selectedExecutionContext,
        );
      } else {
        return;
      }
    };

    const handleNameChange = (value: string | undefined) => {
      if (selectedExecutionContext) {
        set_executionContextName(selectedExecutionContext, value ?? '');
        dataSpaceEditorState.setSelectedExecutionContext(
          selectedExecutionContext,
        );
      } else {
        return;
      }
    };

    const handleMappingChange = (option: {
      value: PackageableElementReference<Mapping>;
    }) => {
      if (selectedExecutionContext) {
        set_mapping(selectedExecutionContext, option.value);
      } else {
        return;
      }
    };

    const handleRuntimeChange = (option: {
      value: PackageableElementReference<PackageableRuntime>;
    }) => {
      if (selectedExecutionContext) {
        set_runtime(selectedExecutionContext, option.value);
      } else {
        return;
      }
    };

    const mappingOptions =
      dataSpaceEditorState.editorStore.graphManagerState.usableMappings.map(
        (mapping) => ({
          label: mapping.path,
          value: PackageableElementExplicitReference.create(mapping),
        }),
      );

<<<<<<< HEAD
      const handleAddExecutionContext = () => {
        if (newExecutionContextName && selectedMapping && selectedRuntime) {
          addExecutionContext(
            newExecutionContextName,
            selectedMapping,
            selectedRuntime,
          );
          setNewExecutionContextName('');
          setSelectedMapping(null);
          setSelectedRuntime(null);
          closeModal();
        } else {
          console.error(
            'Missing required fields for creating execution context',
          );
        }
      };

      const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
      const onContextMenuClose = (): void =>
        setIsSelectedFromContextMenu(false);

      const handleNewExecutionContextNameChange = (
        value: string | undefined,
      ) => {
        setNewExecutionContextName(value ?? '');
      };

      return (
        <div className="execution-context-tab">
          <CustomSelectorInput
            options={dataSpaceEditorState.dataSpace.executionContexts.map(
              (context) => ({
                label: context.name,
                value: context,
              }),
            )}
            onChange={(option: { value: DataSpaceExecutionContext }) =>
              dataSpaceEditorState.setDefaultExecutionContext(option.value)
            }
            value={dataSpaceEditorState.dataSpace.executionContexts.find(
              (context) =>
                context ===
                dataSpaceEditorState.dataSpace.defaultExecutionContext,
            )}
            placeholder="Select Default Execution Context"
            darkMode="true"
          />

          <ContextMenu
            className={clsx('dataSpace-editor__context-menu', {
              'dataSpace-editor__context-menu--selected-from-context-menu':
                isSelectedFromContextMenu,
            })}
            content={<ExecutionContextMenu add={openModal} />}
            menuProps={{ elevation: 7 }}
            onOpen={onContextMenuOpen}
            onClose={onContextMenuClose}
          >
            <button
              onClick={openModal}
              className="dataSpace-editor__add-context-button dataSpace-editor__emailSupport__validation-label"
            >
              <PlusIcon />
              Add Execution Context
            </button>
          </ContextMenu>
          {isModalOpen && (
            <div className="modal">
              <div>
                <PanelFormTextField
                  name="Execution Context Name"
                  value={newExecutionContextName}
                  update={(value) => setNewExecutionContextName(value ?? '')}
                  placeholder="Enter name"
                />
              </div>
              <PanelFormListItems title="Mapping">
                <div>
                  <CustomSelectorInput
                    options={mappingOptions}
                    onChange={(option: MappingOption) =>
                      setSelectedMapping(option.value)
                    }
                    value={
                      selectedMapping
                        ? {
                            label: selectedMapping.value.path,
                            value: selectedMapping,
                          }
                        : null
                    }
                    placeholder="Select Mapping"
                    darkMode="true"
                  />
                </div>
              </PanelFormListItems>
              <div>
                <PanelFormListItems title="Default runtime">
                  <CustomSelectorInput
                    options={runtimeOptions}
                    onChange={(option: RuntimeOption) =>
                      setSelectedRuntime(option.value)
                    }
                    value={
                      selectedRuntime
                        ? {
                            label: selectedRuntime.value.path,
                            value: selectedRuntime,
                          }
                        : null
                    }
                    placeholder="Select Runtime"
                    darkMode="true"
                  />
                </PanelFormListItems>
              </div>
              <div>
                <button
                  className="dataSpace-editor__emailSupport__validation-label"
                  onClick={handleAddExecutionContext}
                >
                  <PlusIcon /> Add
                </button>
              </div>
              <div>
                <button
                  className="dataSpace-editor__emailSupport__validation-label"
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {executionContext && (
            <>
              <div>
                <PanelFormTextField
                  name="Execution Context Name"
                  value={executionContext.name}
                  update={handleNameChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <PanelFormTextField
                  name="Execution Context Title"
                  value={executionContext.title ?? ''}
                  update={handleTitleChange}
                  placeholder="Enter title"
                />
              </div>
              <div>
                <PanelFormTextField
                  name="Execution Context Description"
                  value={executionContext.description ?? ''}
                  update={handleDescriptionChange}
                  placeholder="Enter description"
                />
              </div>
              <PanelFormListItems title="Mapping">
                <CustomSelectorInput
                  options={mappingOptions}
                  onChange={(option: MappingOption) =>
                    handleMappingChange(option)
                  }
                  value={mappingOptions.find(
                    (option) => option.value === selectedMapping,
                  )}
                  placeholder="Select Mapping"
                  darkMode="true"
                />
              </PanelFormListItems>
              <PanelFormListItems title="Default Runtime">
                <CustomSelectorInput
                  options={runtimeOptions}
                  onChange={(option: RuntimeOption) =>
                    handleRuntimeChange(option)
                  }
                  value={runtimeOptions.find(
                    (option) => option.value === selectedRuntime,
                  )}
                  placeholder="Select Runtime"
                  darkMode="true"
                />
              </PanelFormListItems>
            </>
          )}
=======
    const runtimeOptions =
      dataSpaceEditorState.editorStore.graphManagerState.usableRuntimes.map(
        (runtime) => ({
          label: runtime.path,
          value: PackageableElementExplicitReference.create(runtime),
        }),
      );

    const handleAddExecutionContext = (): void => {
      dataSpaceEditorState.addExecutionContext();
    };

    return (
      <div className="data-space-execution-context-editor">
        <div className="data-space-execution-context__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={300}>
              <div className="data-space-execution-context__left_content">
                <PanelHeader
                  title="Execution Contexts"
                  className="half-width-panel-header"
                >
                  <PanelHeaderActions>
                    <PanelHeaderActionItem
                      onClick={handleAddExecutionContext}
                      title="Add Execution Context"
                      className="data-space-execution-context-editor execution-context-item__action"
                    >
                      <PlusIcon />
                    </PanelHeaderActionItem>
                  </PanelHeaderActions>
                </PanelHeader>

                <PanelContent>
                  {dataSpaceEditorState.dataSpace.executionContexts.map(
                    (context, index) => (
                      <ExecutionContextItem
                        key={context.hashCode}
                        executionContext={context}
                        dataSpaceEditorState={dataSpaceEditorState}
                        idx={index}
                      />
                    ),
                  )}
                  {!dataSpaceEditorState.dataSpace.executionContexts.length && (
                    <BlankPanelPlaceholder
                      text="Add Execution Context"
                      onClick={handleAddExecutionContext}
                      clickActionType="add"
                      tooltipText="Click to add execution context"
                    />
                  )}
                </PanelContent>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <Panel className="data-space-execution-context-details">
                {dataSpaceEditorState.dataSpace.executionContexts.length ? (
                  <>
                    <div>
                      <PanelFormTextField
                        name="Execution Context Name"
                        value={selectedExecutionContext?.name}
                        update={handleNameChange}
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <PanelFormTextField
                        name="Execution Context Title"
                        value={selectedExecutionContext?.title}
                        update={handleTitleChange}
                        placeholder="Enter title"
                      />
                    </div>
                    <div>
                      <PanelFormTextField
                        name="Execution Context Description"
                        value={selectedExecutionContext?.description}
                        update={handleDescriptionChange}
                        placeholder="Enter description"
                      />
                    </div>
                    <PanelFormListItems title="Mapping">
                      <CustomSelectorInput
                        options={mappingOptions}
                        onChange={handleMappingChange}
                        value={mappingOptions.find(
                          (option) =>
                            option.value === selectedExecutionContext?.mapping,
                        )}
                        placeholder="Select Mapping"
                        darkMode="true"
                      />
                    </PanelFormListItems>
                    <PanelFormListItems title="Default Runtime">
                      <CustomSelectorInput
                        options={runtimeOptions}
                        onChange={handleRuntimeChange}
                        value={runtimeOptions.find(
                          (option) =>
                            option.value ===
                            selectedExecutionContext?.defaultRuntime,
                        )}
                        placeholder="Select Runtime"
                        darkMode="true"
                      />
                    </PanelFormListItems>
                  </>
                ) : (
                  <BlankPanelPlaceholder
                    text="Select an Execution Context to view details"
                    tooltipText="Select an execution context"
                  />
                )}
              </Panel>
            </ResizablePanel>
          </ResizablePanelGroup>
>>>>>>> executionContext is finished
        </div>
      </div>
    );
  });
