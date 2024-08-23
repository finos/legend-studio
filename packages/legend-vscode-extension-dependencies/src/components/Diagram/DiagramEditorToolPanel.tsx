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
  clsx,
  MousePointerIcon,
  MoveIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@finos/legend-art';
import {
  DIAGRAM_INTERACTION_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
} from '@finos/legend-extension-dsl-diagram';
import { observer } from 'mobx-react-lite';
import type { DiagramEditorState } from '../../stores/DiagramEditorState.js';

export const DiagramEditorToolPanel = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const renderer = diagramEditorState.renderer;
    //const isReadOnly = diagramEditorState.isReadOnly;
    const createModeSwitcher =
      (
        editMode: DIAGRAM_INTERACTION_MODE,
        relationshipMode: DIAGRAM_RELATIONSHIP_EDIT_MODE,
      ): (() => void) =>
      (): void => {
        renderer.changeMode(editMode, relationshipMode);
      };

    return (
      <div className="diagram-editor__tools">
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.LAYOUT,
          })}
          tabIndex={-1}
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.LAYOUT,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
          title="View Tool (V)"
        >
          <MousePointerIcon className="diagram-editor__icon--layout" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.PAN,
          })}
          tabIndex={-1}
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.PAN,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
          title="Pan Tool (M)"
        >
          <MoveIcon className="diagram-editor__icon--pan" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.ZOOM_IN,
          })}
          tabIndex={-1}
          title="Zoom In (Z)"
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.ZOOM_IN,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
        >
          <ZoomInIcon className="diagram-editor__icon--zoom-in" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.ZOOM_OUT,
          })}
          tabIndex={-1}
          title="Zoom Out (Z)"
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.ZOOM_OUT,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
        >
          <ZoomOutIcon className="diagram-editor__icon--zoom-out" />
        </button>
      </div>
    );
  },
);
