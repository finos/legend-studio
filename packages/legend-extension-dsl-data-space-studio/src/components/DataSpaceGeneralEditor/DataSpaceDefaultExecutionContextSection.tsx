import { CustomSelectorInput, PanelFormSection } from '@finos/legend-art';
import type { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import { dataSpace_setDefaultExecutionContext } from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { useEditorStore } from '@finos/legend-application-studio';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';

export const DataSpaceDefaultExecutionContextSection = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;

  // Event handlers
  const handleDefaultExecutionContextChange = (option: {
    label: string;
    value: unknown;
  }): void => {
    if (option && option.value && typeof option.value === 'object') {
      const context = option.value as DataSpaceExecutionContext;
      dataSpace_setDefaultExecutionContext(dataSpace, context);
    }
  };

  return (
    <PanelFormSection>
      <div className="panel__content__form__section__header__label">
        Default Execution Context
      </div>
      <div className="panel__content__form__section__header__prompt">
        Select the default execution context for this Data Space.
      </div>
      <CustomSelectorInput
        options={dataSpace.executionContexts.map((context) => ({
          label: context.name,
          value: context,
        }))}
        onChange={(option: { label: string; value: unknown }) =>
          handleDefaultExecutionContextChange(option)
        }
        value={{
          label: dataSpace.defaultExecutionContext.name,
          value: dataSpace.defaultExecutionContext,
        }}
        darkMode={true}
        key={`default-execution-context-${dataSpace.defaultExecutionContext.name}`}
      />
    </PanelFormSection>
  );
});
