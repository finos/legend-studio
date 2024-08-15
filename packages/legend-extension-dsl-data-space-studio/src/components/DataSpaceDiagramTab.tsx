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

import { observer } from 'mobx-react-lite';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  PanelFormSection,
  CustomSelectorInput,
  PanelFormTextField,
  BlankPanelPlaceholder,
  clsx,
  Panel,
  PanelContent,
  PanelFormListItems,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PlayIcon,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TrashIcon,
} from '@finos/legend-art';
import type { Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import type { DataSpaceDiagram } from '@finos/legend-extension-dsl-data-space/graph';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
} from '@finos/legend-graph';
import {
  set_dataSpaceDiagramTitle,
  set_dataSpaceDiagramDescription,
  set_dataSpaceDiagram,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';

interface DiagramProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

interface DiagramTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

interface DiagrmaItemProps {
  diagram: DataSpaceDiagram;
  dataSpaceEditorState: DataSpaceEditorState;
  idx: number;
}

const DiagramItem: React.FC<DiagrmaItemProps> = observer((props) => {
  const { diagram, dataSpaceEditorState, idx } = props;
  const applicationStore = useApplicationStore();
  const isActive = dataSpaceEditorState.selectedDiagram === diagram;

  const openDiagram = (): void => {
    dataSpaceEditorState.setSelectedDiagram(diagram);
  };

  const deleteDiagram = (): void => {
    dataSpaceEditorState.removeDiagram(diagram);
    if (isActive || dataSpaceEditorState.dataSpace.diagrams?.length === 0) {
      dataSpaceEditorState.setSelectedDiagram(null);
    }
  };

  const runDiagram = (): void => {
    openDiagram();
    flowResult(
      applicationStore.alertUnhandledError(new Error('Diagram selected')),
    );
  };

  return (
    <div
      className={clsx('diagram-item', {
        'diagram-item--active': isActive,
      })}
      onClick={openDiagram}
    >
      <button
        className={clsx('diagram-item__label')}
        onClick={openDiagram}
        tabIndex={-1}
      >
        <div className="diagram-item__label__text">
          {diagram.title || `Diagram ${idx + 1}`}
        </div>
      </button>
      <div className="diagram-item__actions">
        <button
          className="diagram-item__action diagram-item-run-btn"
          onClick={runDiagram}
          tabIndex={-1}
          title={`Run ${diagram.title || `Diagram ${idx + 1}`}`}
        >
          <PlayIcon />
        </button>
        <button
          className="diagram-item__action diagram-item-delete-btn"
          onClick={deleteDiagram}
          tabIndex={-1}
          title={`Delete ${diagram.title || `Diagram ${idx + 1}`}`}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
});

export const DataSpaceDigramTab: React.FC<DiagramProps> = observer(
  ({ dataSpaceEditorState }) => {
    const { diagrams } = dataSpaceEditorState;

    const handleTitleChange = (value: string | undefined): void => {
      if (dataSpaceEditorState.selectedDiagram) {
        set_dataSpaceDiagramTitle(
          dataSpaceEditorState.selectedDiagram,
          value ?? '',
        );
      }
    };

    const handleDescriptionChange = (value: string | undefined): void => {
      if (dataSpaceEditorState.selectedDiagram) {
        set_dataSpaceDiagramDescription(
          dataSpaceEditorState.selectedDiagram,
          value ?? '',
        );
      }
    };

    const handleDiagramChange = (option: {
      value: PackageableElementReference<Diagram>;
    }) => {
      if (dataSpaceEditorState.selectedDiagram) {
        set_dataSpaceDiagram(
          dataSpaceEditorState.selectedDiagram,
          option.value,
        );
      }
    };

    const handleAddDiagram = (): void => {
      dataSpaceEditorState.addDiagram();
    };

    const diagramOptions =
      dataSpaceEditorState.editorStore.graphManagerState.graph.allElements.map(
        (diagram) => ({
          label: diagram.path,
          value: PackageableElementExplicitReference.create(diagram),
        }),
      );

    return (
      <div className="data-space-diagram-editor">
        <PanelHeader title="Diagrams" className="half-width-panel-header">
          <PanelHeaderActions>
            <PanelHeaderActionItem
              onClick={handleAddDiagram}
              title="Add Diagram"
              className="data-space-diagram-editor diagram-item__action"
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <div className="data-space-diagram__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={300}>
              <PanelContent>
                {dataSpaceEditorState.dataSpace.diagrams?.map(
                  (diagram, index) => (
                    <DiagramItem
                      key={diagram.hashCode}
                      diagram={diagram}
                      dataSpaceEditorState={dataSpaceEditorState}
                      idx={index}
                    />
                  ),
                )}
                {!dataSpaceEditorState.dataSpace.diagrams?.length && (
                  <BlankPanelPlaceholder
                    text="Add Diagram"
                    onClick={handleAddDiagram}
                    clickActionType="add"
                    tooltipText="Click to add diagram"
                  />
                )}
              </PanelContent>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-400)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <Panel className="data-space-diagram-details">
                {dataSpaceEditorState.dataSpace.diagrams?.length ? (
                  <>
                    <div>
                      <PanelFormTextField
                        name="Diagram Title"
                        value={dataSpaceEditorState.selectedDiagram?.title}
                        update={handleTitleChange}
                        placeholder="Enter title"
                      />
                    </div>
                    <div>
                      <PanelFormTextField
                        name="Diagram Description"
                        value={
                          dataSpaceEditorState.selectedDiagram?.description
                        }
                        update={handleDescriptionChange}
                        placeholder="Enter description"
                      />
                    </div>
                    <PanelFormListItems title="Diagram">
                      <CustomSelectorInput
                        options={diagramOptions}
                        onChange={handleDiagramChange}
                        value={{
                          label:
                            dataSpaceEditorState.selectedDiagram?.diagram.value
                              .path,
                          value:
                            dataSpaceEditorState.selectedDiagram?.diagram.value,
                        }}
                        placeholder="Select Diagram"
                        darkMode="true"
                        noOptionsMessage="Please select a diagram"
                      />
                    </PanelFormListItems>
                  </>
                ) : (
                  <BlankPanelPlaceholder
                    text="Select a Diagram to view details"
                    tooltipText="Select a diagram"
                  />
                )}
              </Panel>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);
