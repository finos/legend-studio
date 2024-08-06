import React from 'react';
import { observer } from 'mobx-react-lite';
import { CustomSelectorInput, PanelFormTextField } from '@finos/legend-art';
import {
  set_executionContextDescription,
  set_executionContextName,
  set_executionContextTitle,
  set_mapping,
  set_runtime,
  set_testData,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import type { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  PackageableElementReference,
  type DataElementReference,
  type Mapping,
  type PackageableRuntime,
} from '@finos/legend-graph';

interface ExecutionContextTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

interface MappingOption {
  value: Mapping;
  label: string;
}
interface RuntimeOption {
  value: PackageableRuntime;
  label: string;
}
interface TestDataOption {
  value: string;
  label: string;
}

export const DataSpaceExecutionContextTab: React.FC<ExecutionContextTabProps> =
  observer(({ dataSpaceEditorState }) => {
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

    const handleMappingChange = (
      option: PackageableElementReference<Mapping>,
    ): void => {
      set_mapping(executionContext, option);
    };

    const handleRuntimeChange = (
      option: PackageableElementReference<PackageableRuntime>,
    ): void => {
      set_runtime(executionContext, option);
    };

    const handleTestDataChange = (option: DataElementReference): void => {
      set_testData(executionContext, option);
    };

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

    return (
      <div className="execution-context-tab">
        <div>
          <PanelFormTextField
            name="Execution Context Name"
            value={executionContext.name ?? ''}
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
          options={[mappingOptions]}
          onChange={handleMappingChange}
          value={mappingOptions.find(
            (option) => option.value === executionContext.mapping.value,
          )}
          placeholder="Select Mapping"
        />
        <CustomSelectorInput
          options={[runtimeOptions]}
          onChange={handleRuntimeChange}
          value={runtimeOptions.find(
            (option) => option.value === executionContext.defaultRuntime.value,
          )}
          placeholder="Select Runtime"
        />
        <PanelFormTextField
          name="Execution Context Test Data"
          value={executionContext.testData}
          update={handleTestDataChange}
          placeholder="Enter test data"
        />
      </div>
    );
  });
