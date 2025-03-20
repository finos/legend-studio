import { DataSpacePackageableElementExecutable } from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import {
  dataSpace_addExecutable,
  dataSpace_removeExecutable,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { useEditorStore } from '@finos/legend-application-studio';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';

export const DataspaceExecutablesSection = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;

  // Event handlers
  const handleAddExecutable = (): void => {
    const newExecutable = new DataSpacePackageableElementExecutable();
    newExecutable.title = `Executable ${dataSpace.executables?.length ?? 0 + 1}`;
    dataSpace_addExecutable(dataSpace, newExecutable);
  };

  const handleRemoveExecutable = (index: number): void => {
    dataSpace_removeExecutable(dataSpace, index);
  };

  return null;
  /* <PanelFormListItems title="Executables">
            {formElement.executables?.map((executable, index) => (
              <div
                key={index}
                className="panel__content__form__section__list__item"
              >
                <PanelFormTextField
                  name={`Executable ${index + 1} Title`}
                  value={executable.title}
                  update={(value) => {
                    if (
                      formElement.executables &&
                      formElement.executables[index]
                    ) {
                      formElement.executables[index].title = value ?? '';
                    }
                  }}
                  placeholder="Enter title"
                />
                <PanelFormTextField
                  name={`Executable ${index + 1} Description`}
                  value={executable.description ?? ''}
                  update={(value) => {
                    if (
                      formElement.executables &&
                      formElement.executables[index]
                    ) {
                      formElement.executables[index].description = value;
                    }
                  }}
                  placeholder="Enter description"
                />
                <button
                  className="panel__content__form__section__button"
                  onClick={() => handleRemoveExecutable(index)}
                >
                  Remove
                </button>
              </div>
            )) ?? <div>No executables defined</div>}
            <button
              className="panel__content__form__section__button"
              onClick={handleAddExecutable}
            >
              Add Executable
            </button>
          </PanelFormListItems> */
});
