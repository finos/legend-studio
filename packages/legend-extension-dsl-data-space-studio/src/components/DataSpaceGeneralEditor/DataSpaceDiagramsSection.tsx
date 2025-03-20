import { useEditorStore } from '@finos/legend-application-studio';
import {
  CustomSelectorInput,
  ListEditor,
  PanelFormSection,
  PanelFormTextField,
} from '@finos/legend-art';
import { DataSpaceDiagram } from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import { PackageableElementExplicitReference } from '@finos/legend-graph';
import { type Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import {
  dataSpace_addDiagram,
  dataSpace_removeDiagram,
  dataSpace_setDiagramTitle,
  dataSpace_setDiagramDescription,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';

export const DataSpaceDiagramsSection = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;

  // Event handlers
  const handleAddDiagram = (option: {
    label: string;
    value: Diagram;
  }): void => {
    if (option && option.value && typeof option.value === 'object') {
      const diagramValue = option.value;
      const newDiagram = new DataSpaceDiagram();
      newDiagram.title = diagramValue.name;
      newDiagram.diagram =
        PackageableElementExplicitReference.create(diagramValue);
      dataSpace_addDiagram(dataSpace, newDiagram);
    }
  };

  const handleRemoveDiagram = (diagram: DataSpaceDiagram): void => {
    dataSpace_removeDiagram(dataSpace, diagram);
  };

  const handleDiagramTitleChange = (
    diagram: DataSpaceDiagram,
    value: string | undefined,
  ): void => {
    dataSpace_setDiagramTitle(diagram, value ?? '');
  };

  const handleDiagramDescriptionChange = (
    diagram: DataSpaceDiagram,
    value: string | undefined,
  ): void => {
    dataSpace_setDiagramDescription(diagram, value);
  };

  // ListEditor component renderers
  const DiagramComponent = observer(
    (props: { item: DataSpaceDiagram }): React.ReactElement => {
      const { item } = props;

      return (
        <>
          <div className="panel__content__form__section__list__item__content">
            <div className="panel__content__form__section__header__label">
              Diagram
            </div>
            <div className="panel__content__form__section__list__item__content__title">
              {item.diagram.value.path}
            </div>
          </div>
          <div className="panel__content__form__section__list__item__form">
            <PanelFormTextField
              name="Title"
              value={item.title}
              update={(value) => handleDiagramTitleChange(item, value)}
              placeholder="Enter title"
              className="dataSpace-editor__general__diagrams__title"
            />
            <PanelFormTextField
              name="Description"
              value={item.description ?? ''}
              update={(value) => handleDiagramDescriptionChange(item, value)}
              placeholder="Enter description"
              className="dataSpace-editor__general__diagrams__description"
            />
          </div>
        </>
      );
    },
  );

  const NewDiagramComponent = observer(
    (props: { onFinishEditing: () => void }): React.ReactElement => {
      const { onFinishEditing } = props;

      return (
        <div className="panel__content__form__section__list__new-item__input">
          <CustomSelectorInput
            options={dataSpaceState.getDiagramOptions()}
            onChange={(event: { label: string; value: Diagram }) => {
              onFinishEditing();
              handleAddDiagram(event);
            }}
            placeholder="Select a diagram to add..."
            darkMode={true}
          />
        </div>
      );
    },
  );

  return (
    <PanelFormSection className="dataSpace-editor__general__diagrams">
      <ListEditor
        title="Diagrams"
        prompt="Add diagrams to include in this Data Space. Set a title and description for each diagram."
        items={dataSpace.diagrams}
        keySelector={(element: DataSpaceDiagram) => element.diagram.value.path}
        ItemComponent={DiagramComponent}
        NewItemComponent={NewDiagramComponent}
        handleRemoveItem={handleRemoveDiagram}
        isReadOnly={dataSpaceState.isReadOnly}
        emptyMessage="No diagrams specified"
      />
    </PanelFormSection>
  );
});
