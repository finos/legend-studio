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
} from '@finos/legend-art';
import type { Diagram } from '@finos/legend-extension-dsl-diagram/graph';

interface DiagramProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

export const DataSpaceDigramTab: React.FC<DiagramProps> = observer(
  ({ dataSpaceEditorState }) => {
    const handleSelectDiagram = (option: { value: Diagram }) => {
      const selectedDiagram = dataSpaceEditorState.diagrams.find(
        (d) => d.diagram.value === option.value,
      );
      if (selectedDiagram) {
        dataSpaceEditorState.selectDiagram(selectedDiagram);
      }
    };

    const diagramOptions = dataSpaceEditorState.diagrams.map((diagram) => ({
      label: diagram.diagram,
      value: diagram.diagram.value,
    }));

    return (
      <div className="data-space-diagram-tab">
        <PanelFormSection>
          <CustomSelectorInput
            options={diagramOptions}
            onChange={handleSelectDiagram}
            value={
              dataSpaceEditorState.selectedDiagram
                ? {
                    label:
                      dataSpaceEditorState.selectedDiagram.diagram.value.name,
                    value: dataSpaceEditorState.selectedDiagram.diagram.value,
                  }
                : null
            }
            placeholder="Select a Diagram"
            darkMode="true"
          />
        </PanelFormSection>

        {dataSpaceEditorState.selectedDiagram && (
          <>
            <PanelFormSection>
              <PanelFormTextField
                name="Diagram Title"
                value={dataSpaceEditorState.selectedDiagram.title}
                update={(value) => {
                  dataSpaceEditorState.selectedDiagram!.title = value ?? '';
                }}
                placeholder="Enter diagram title"
              />
            </PanelFormSection>

            <PanelFormSection>
              <PanelFormTextField
                name="Diagram Description"
                value={dataSpaceEditorState.selectedDiagram.description ?? ''}
                update={(value) => {
                  dataSpaceEditorState.selectedDiagram!.description =
                    value ?? '';
                }}
                placeholder="Enter diagram description"
              />
            </PanelFormSection>
          </>
        )}
      </div>
    );
  },
);
