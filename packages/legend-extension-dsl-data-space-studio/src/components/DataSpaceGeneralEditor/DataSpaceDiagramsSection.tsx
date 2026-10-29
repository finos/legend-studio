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

import {
  EditorFormSection,
  getElementIcon,
  useEditorStore,
} from '@finos/legend-application-studio';
import { CustomSelectorInput, PlusIcon, TimesIcon } from '@finos/legend-art';
import { DataSpaceDiagram } from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { uuid } from '@finos/legend-shared';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import { PackageableElementExplicitReference } from '@finos/legend-graph';
import { type Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import {
  dataSpace_addDiagram,
  dataSpace_removeDiagram,
  dataSpace_setDiagramTitle,
  dataSpace_setDiagramDescription,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';

// the same diagram can be listed twice (with different titles), so rows are keyed by entry
const diagramRowKeys = new WeakMap<DataSpaceDiagram, string>();
const getDiagramRowKey = (diagram: DataSpaceDiagram): string => {
  let key = diagramRowKeys.get(diagram);
  if (!key) {
    key = uuid();
    diagramRowKeys.set(diagram, key);
  }
  return key;
};

export const DataSpaceDiagramsSection = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;
  const isReadOnly = dataSpaceState.isReadOnly;
  const diagrams = dataSpace.diagrams ?? [];
  const [isAdding, setIsAdding] = useState(false);

  const addDiagram = (option: { label: string; value: Diagram }): void => {
    const newDiagram = new DataSpaceDiagram();
    newDiagram.title = option.value.name;
    newDiagram.diagram = PackageableElementExplicitReference.create(
      option.value,
    );
    dataSpace_addDiagram(dataSpace, newDiagram);
    setIsAdding(false);
  };

  return (
    <EditorFormSection
      title="Diagrams"
      description="Diagrams shown when people browse this data space, each with a title and a description."
    >
      {diagrams.length ? (
        <div className="dataSpace-editor-table dataSpace-editor-table--diagrams">
          <div className="dataSpace-editor-table__row dataSpace-editor-table__row--header">
            <div>Diagram</div>
            <div>Title</div>
            <div>Description</div>
            <div />
          </div>
          {diagrams.map((diagram) => (
            <div
              key={getDiagramRowKey(diagram)}
              className="dataSpace-editor-table__row"
            >
              <div
                className="dataSpace-editor-table__element"
                title={diagram.diagram.value.path}
              >
                {getElementIcon(diagram.diagram.value, editorStore)}
                <span className="dataSpace-editor-table__element__name">
                  {diagram.diagram.value.name}
                </span>
                <span className="dataSpace-editor-table__element__package">
                  {diagram.diagram.value.package?.path}
                </span>
              </div>
              <input
                className="input input--dark dataSpace-editor-table__input"
                spellCheck={false}
                disabled={isReadOnly}
                value={diagram.title}
                onChange={(event): void =>
                  dataSpace_setDiagramTitle(diagram, event.target.value)
                }
                placeholder="Title"
                title="Diagram title"
              />
              <input
                className="input input--dark dataSpace-editor-table__input"
                spellCheck={false}
                disabled={isReadOnly}
                value={diagram.description ?? ''}
                onChange={(event): void =>
                  dataSpace_setDiagramDescription(
                    diagram,
                    event.target.value || undefined,
                  )
                }
                placeholder="Add a description"
                title="Diagram description"
              />
              <button
                className="dataSpace-editor-table__remove-btn"
                disabled={isReadOnly}
                onClick={(): void =>
                  dataSpace_removeDiagram(dataSpace, diagram)
                }
                title="Remove this diagram from the data space"
              >
                <TimesIcon />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="dataSpace-editor-table__empty">
          No diagrams yet. A diagram helps people see the shape of the model
          before they query it.
        </div>
      )}
      {isAdding ? (
        <div className="dataSpace-editor-add-picker">
          <CustomSelectorInput
            options={dataSpaceState.getDiagramOptions()}
            onChange={addDiagram}
            placeholder="Choose a diagram to add..."
            darkMode={
              !editorStore.applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            autoFocus={true}
            openMenuOnFocus={true}
          />
          <button
            className="dataSpace-editor-add-picker__cancel"
            onClick={(): void => setIsAdding(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          className="dataSpace-editor-add-btn"
          disabled={isReadOnly}
          onClick={(): void => setIsAdding(true)}
        >
          <PlusIcon />
          Add diagram
        </button>
      )}
    </EditorFormSection>
  );
});
