import React from 'react';
import { observer } from 'mobx-react-lite';
import { CustomSelectorInput, PanelFormTextField } from '@finos/legend-art';
import {
  set_executionContextDescription,
  set_executionContextName,
  set_executionContexts,
  set_executionContextTitle,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import type { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';

interface ExecutionContextTabProps {
  executionContext: DataSpaceExecutionContext;
  isReadOnly: boolean;
}
interface ExecutionContextTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

export const DataSpaceExecutionContextTab: React.FC<ExecutionContextTabProps> =
  observer(({ dataSpaceEditorState }) => {
    const executionContext = dataSpaceEditorState.selectedExecutionContext;

    if (!executionContext) {
      return <div>Select an execution context to view details.</div>;
    }

    const handleTitleChange = (value: string | undefined): void => {
      console.log('titlechange');
      set_executionContextTitle(executionContext, value);
    };

    const handleDescriptionChange = (value: string | undefined): void => {
      console.log('descriptionChange', value);
      set_executionContextDescription(executionContext, value);
    };

    const handleNameChange = (value: string | undefined) => {
      console.log('name changed', value);
      set_executionContextName(executionContext, value ?? '');
    };

    const handleMappingChange = (value: any) => {
      console.log('mapping', value);
    };

    const handleRuntimeChange = (value: any) => {
      console.log('runtime', value);
    };

    const handleTestDataChange = (value: any) => {
      console.log('testData', value);
    };

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
          options={[]}
          onChange={handleMappingChange}
          value={undefined}
          placeholder="Select Mapping"
        />
        <CustomSelectorInput
          options={[]}
          onChange={handleRuntimeChange}
          value={undefined}
          placeholder="Select Runtime"
        />
        <CustomSelectorInput
          options={[]}
          onChange={handleTestDataChange}
          value={undefined}
          placeholder="Select Test Data"
        />
      </div>
    );
  });
