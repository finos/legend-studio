/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { MenuContentItem, Tooltip } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CUBE_CANVAS_NOTE_HEIGHT } from './CubeCanvasLayout.js';

// A step's note on the canvas (PLAN §11.31): one muted line under the step,
// the whole note on hover. It says why the step is there, where the step's
// label says what it does.

export enum CUBE_STEP_NOTE_LABEL {
  ADD = 'Add Note…',
  EDIT = 'Edit Note…',
  FIELD = 'Note',
  PLACEHOLDER = 'Why this step is here, shown under it on the canvas',
}

/** What a click on a step's note is told apart by: it opens the editor at the note */
export const CUBE_CANVAS_STEP_NOTE_CLASS = 'legend-cube__node-note';

/** The note under a step: its lines run together on one line, cut short */
export const CubeCanvasStepNote: React.FC<{ text: string }> = (props) => (
  <Tooltip
    // the whole note, as written, after a moment, below the step
    title={<div className="whitespace-pre-line">{props.text}</div>}
    placement="bottom"
    enterDelay={500}
    enterNextDelay={500}
    disableInteractive={true}
    slotProps={{ tooltip: { className: 'max-w-[40rem]' } }}
  >
    <div
      className={`${CUBE_CANVAS_STEP_NOTE_CLASS} truncate px-1 pt-1 text-sm italic text-[var(--color-text-muted)]`}
      style={{ height: CUBE_CANVAS_NOTE_HEIGHT }}
      data-testid={LEGEND_CUBE_TEST_ID.CANVAS_STEP_NOTE}
    >
      {props.text.replace(/\s+/gu, ' ')}
    </div>
  </Tooltip>
);

/**
 * Add Note… or Edit Note… in a step's menu: opens its editor at the Note
 * field, once the menu has closed, so its list doesn't take the focus back
 */
export const CubeStepNoteMenuItem = observer(
  (props: { editorState: CubeEditorState; nodeId?: string | undefined }) => {
    const { editorState, nodeId } = props;
    const hasNote =
      nodeId !== undefined && editorState.getStepNote(nodeId) !== undefined;
    return (
      <MenuContentItem
        title="Write why this step is here; the note shows under it"
        disabled={nodeId === undefined || !editorState.canEditStepNote(nodeId)}
        onClick={() =>
          nodeId !== undefined &&
          window.setTimeout(() => editorState.nodeEditor.openAtNote(nodeId))
        }
      >
        {hasNote ? CUBE_STEP_NOTE_LABEL.EDIT : CUBE_STEP_NOTE_LABEL.ADD}
      </MenuContentItem>
    );
  },
);
