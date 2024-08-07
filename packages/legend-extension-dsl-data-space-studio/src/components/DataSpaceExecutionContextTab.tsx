import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  CustomSelectorInput,
  PanelFormTextField,
  PlusIcon,
} from '@finos/legend-art';
import {
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
  PackageableElementReference,
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
  addExecutionContext: () => void;
}

interface MappingOption {
  value: Mapping;
  label: string;
}
interface RuntimeOption {
  value: PackageableRuntime;
  label: string;
}

// TODO: ;
// interface TestDataOption {
//   value: string;
//   label: string;
// }

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
    }) => {
      // const [isModalOpen, setIsModalOpen] = useState(false);
      // const [newExecutionContextName, setNewExecutionContextName] = useState('');
      const [selectedMapping, setSelectedMapping] =
        useState<PackageableElementReference<Mapping> | null>(null);
      const [selectedRuntime, setSelectedRuntime] =
        useState<PackageableElementReference<PackageableRuntime> | null>(null);
      // const [selectedTestData, setSelectedTestData] = useState('');
      const executionContext = dataSpaceEditorState.selectedExecutionContext;

      if (!executionContext) {
        return (
          <div className="dataSpace-editor__emailSupport__validation-label">
            Select an execution context to view details.
          </div>
        );
      }

      const handleTitleChange = (value: string | undefined): void => {
        set_executionContextTitle(executionContext, value);
      };

      const handleDescriptionChange = (value: string | undefined): void => {
        set_executionContextDescription(executionContext, value);
      };

      const handleNameChange = (value: string | undefined) => {
        set_executionContextName(executionContext, value ?? '');
      };

      const handleMappingChange = (option: { value: Mapping }): void => {
        set_mapping(
          executionContext,
          PackageableElementExplicitReference.create(option.value),
        );
      };

      const handleRuntimeChange = (option: {
        value: PackageableRuntime;
      }): void => {
        set_runtime(
          executionContext,
          PackageableElementExplicitReference.create(option.value),
        );
      };

      // TODO: ;
      // const handleTestDataChange = (option: string | undefined): void => {
      //   set_testData(executionContext, option);
      // };

      // const openModal = () => {
      //   setIsModalOpen(true);
      // };

      // const closeModal = () => {
      //   setIsModalOpen(false);
      // };

      const mappingOptions =
        dataSpaceEditorState.editorStore.graphManagerState.usableMappings.map(
          (mapping) => ({
            label: mapping.path,
            value: mapping,
          }),
        );

      const runtimeOptions =
        dataSpaceEditorState.editorStore.graphManagerState.usableRuntimes.map(
          (runtime) => ({
            label: runtime.path,
            value: runtime,
          }),
        );

      // const addExecutionContext = () => {
      //   if (newExecutionContextName && selectedMapping && selectedRuntime) {
      //     dataSpaceEditorState.addExecutionContext(
      //       newExecutionContextName,
      //       selectedMapping,
      //       selectedRuntime,
      //     );
      //     closeModal();
      //   }
      // };

      return (
        <div className="execution-context-tab">
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

          <CustomSelectorInput
            options={mappingOptions}
            onChange={handleMappingChange}
            value={mappingOptions.find(
              (option) => option.value === executionContext.mapping.value,
            )}
            placeholder="Select Mapping"
          />
          <CustomSelectorInput
            options={runtimeOptions}
            onChange={handleRuntimeChange}
            value={runtimeOptions.find(
              (option) =>
                option.value === executionContext.defaultRuntime.value,
            )}
            placeholder="Select Runtime"
          />
          {/* ###TODO: */}
          {/* <PanelFormTextField
          name="Execution Context Test Data"
          value={executionContext.testData}
          update={handleTestDataChange}
          placeholder="Enter test data"
        /> */}

          <button
            className="dataSpace-editor__emailSupport__validation-label"
            onClick={openModal}
          >
            <PlusIcon />
            Add New Execution Context
          </button>
          {isModalOpen && (
            <div className="modal">
              <h2>Add New Execution Context</h2>
              <label>
                Name:
                <input
                  type="text"
                  value={newExecutionContextName}
                  onChange={(e) => setNewExecutionContextName(e.target.value)}
                />
              </label>
              <label>
                Mapping:
                <CustomSelectorInput
                  options={mappingOptions}
                  onChange={selectedMapping}
                  value={selectedMapping}
                  placeholder="Select Mapping"
                />
              </label>
              <label>
                Default Runtime:
                <CustomSelectorInput
                  options={runtimeOptions}
                  onChange={selectedRuntime}
                  value={selectedRuntime}
                  placeholder="Select Runtime"
                />
              </label>
              <button
                className="dataSpace-editor__emailSupport__validation-label"
                onClick={addExecutionContext}
              >
                <PlusIcon /> Add
              </button>
              <button
                className="dataSpace-editor__emailSupport__validation-label"
                onClick={closeModal}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      );
    },
  );
