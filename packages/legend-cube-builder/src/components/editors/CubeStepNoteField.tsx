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

import { STEP_NOTE_MAX_LENGTH } from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { useEffect, useId, useRef } from 'react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CUBE_STEP_NOTE_LABEL } from '../canvas/CubeCanvasStepNote.js';

/**
 * The step's note in its editor (PLAN §11.31), under its settings: an edit
 * as they are, which Apply or closing the editor stores, and Cancel drops.
 * An editor with nothing else to set, e.g. a table's, has no Apply or Cancel:
 * closing it stores the note. It takes the keyboard when Add Note… opened
 * the editor.
 */
export const CubeStepNoteField = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { nodeEditor, readOnly } = editorState;
    const fieldRef = useRef<HTMLTextAreaElement>(null);
    const fieldId = useId();
    const { isNoteFocusRequested } = nodeEditor;
    useEffect(() => {
      const field = fieldRef.current;
      if (isNoteFocusRequested && field) {
        field.focus();
        // at the end of the note, to go on writing it
        field.setSelectionRange(field.value.length, field.value.length);
        nodeEditor.clearNoteFocusRequest();
      }
    }, [nodeEditor, isNoteFocusRequested]);
    return (
      <div className="shrink-0 border-t border-[var(--color-border-default)] px-2 py-1">
        <label
          htmlFor={fieldId}
          className="text-sm text-[var(--color-text-secondary)]"
        >
          {CUBE_STEP_NOTE_LABEL.FIELD}
        </label>
        <textarea
          ref={fieldRef}
          id={fieldId}
          className="block w-full resize-y rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          rows={2}
          maxLength={STEP_NOTE_MAX_LENGTH}
          readOnly={readOnly}
          placeholder={readOnly ? undefined : CUBE_STEP_NOTE_LABEL.PLACEHOLDER}
          value={nodeEditor.noteText}
          onChange={(event) => nodeEditor.setNoteText(event.target.value)}
          data-testid={LEGEND_CUBE_TEST_ID.STEP_NOTE_FIELD}
        />
      </div>
    );
  },
);
