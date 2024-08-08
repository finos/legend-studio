import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { forwardRef } from 'react';
import {
  clsx,
  ContextMenu,
  CustomSelectorInput,
  MenuContent,
  MenuContentItem,
  PanelFormListItems,
  PanelFormTextField,
  PlusIcon,
} from '@finos/legend-art';
import {
  dataSpace_addExecutionContext,
  set_executionContextDescription,
  set_executionContextName,
  set_executionContextTitle,
  set_mapping,
  set_runtime,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type Mapping,
  type PackageableRuntime,
} from '@finos/legend-graph';

interface ExecutionContextTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
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
    );
  }),
);

export const DataSpaceExecutionContextTab: React.FC<ExecutionContextTabProps> =
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

      const handleDescriptionChange = (value: string | undefined): void => {
        if (executionContext) {
          set_executionContextDescription(executionContext, value ?? '');
          dataSpaceEditorState.setSelectedExecutionContext(executionContext);
        } else {
          console.error('Execution context is undefined.');
        }
      };

      const handleNameChange = (value: string | undefined) => {
        if (executionContext) {
          set_executionContextName(executionContext, value ?? '');
          dataSpaceEditorState.setSelectedExecutionContext(executionContext);
        } else {
          console.error('Execution context is undefined.');
        }
      };

      const handleMappingChange = (option: MappingOption) => {
        if (executionContext) {
          set_mapping(executionContext, option.value);
          dataSpaceEditorState.setSelectedExecutionContext(executionContext);
        } else {
          console.error('Execution context is undefined.');
        }
      };

      const handleRuntimeChange = (option: RuntimeOption) => {
        if (executionContext) {
          set_runtime(executionContext, option.value);
          dataSpaceEditorState.setSelectedExecutionContext(executionContext);
        } else {
          console.error('Execution context is undefined.');
        }
      };

      const mappingOptions =
        dataSpaceEditorState.editorStore.graphManagerState.usableMappings.map(
          (mapping) => ({
            label: mapping.path,
            value: PackageableElementExplicitReference.create(mapping),
          }),
        );

      const runtimeOptions =
        dataSpaceEditorState.editorStore.graphManagerState.usableRuntimes.map(
          (runtime) => ({
            label: runtime.path,
            value: PackageableElementExplicitReference.create(runtime),
          }),
        );

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
        </div>
      );
    },
  );
